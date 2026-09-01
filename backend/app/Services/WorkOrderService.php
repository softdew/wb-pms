<?php

namespace App\Services;

use App\Enums\BacklogState;
use App\Enums\ExecutingEntity;
use App\Enums\WorkOrderStatus;
use App\Enums\WorkOrderType;
use App\Exceptions\MaintenanceRuleException;
use App\Models\Equipment;
use App\Models\FailureCode;
use App\Models\MaintenancePlan;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderCloseout;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class WorkOrderService
{
    public function __construct(
        protected PlanDerivationService $plans,
        protected StockService $stock,
    ) {
    }

    /**
     * Raise a work order from a due plan line.
     *
     * The task definition is snapshotted here. Editing the library afterwards
     * must not change what this work order says was done.
     */
    public function raiseFromPlan(MaintenancePlan $plan, array $options = []): WorkOrder
    {
        if (! $plan->isActive()) {
            throw new MaintenanceRuleException('This maintenance plan is suspended.');
        }

        $existing = WorkOrder::query()
            ->open()
            ->where('maintenance_plan_id', $plan->id)
            ->first();

        if ($existing) {
            return $existing; // never two open orders for one plan line
        }

        $plan->loadMissing(['task.parts.part', 'task.readings', 'equipment']);
        $task = $plan->task;

        return DB::transaction(function () use ($plan, $task, $options) {
            $workOrder = new WorkOrder([
                'equipment_id' => $plan->equipment_id,
                'maintenance_plan_id' => $plan->id,
                'checklist_task_id' => $task?->id,
                'type' => WorkOrderType::fromTrigger($plan->trigger_class),
                'description' => $task?->activity_description ?? 'Planned maintenance',
                'due_on' => $plan->next_due_on,
                'due_meter_reading' => $plan->next_due_meter_reading,
                'estimated_hours' => $task?->estimated_hours,
                'executing_entity' => $options['executing_entity'] ?? ExecutingEntity::OwnWorkshop,
                'permit_reference' => $options['permit_reference'] ?? null,
            ]);

            $workOrder->forceFill([
                'number' => $this->nextNumber(),
                'status' => WorkOrderStatus::Draft,
                'priority' => $plan->equipment?->criticality_band?->value,
                'task_snapshot' => $this->snapshot($task),
            ])->save();

            $this->copyLines($workOrder, $task);

            return $this->refreshBacklogState($workOrder->refresh());
        });
    }

    /** Corrective work raised against an asset, with no planned task behind it. */
    public function raiseBreakdown(Equipment $equipment, string $description, array $options = []): WorkOrder
    {
        $workOrder = new WorkOrder([
            'equipment_id' => $equipment->id,
            'type' => WorkOrderType::Breakdown,
            'description' => $description,
            'due_on' => $options['due_on'] ?? Carbon::now()->toDateString(),
            'executing_entity' => $options['executing_entity'] ?? ExecutingEntity::OwnWorkshop,
        ]);

        $workOrder->forceFill([
            'number' => $this->nextNumber(),
            'status' => WorkOrderStatus::Draft,
            'priority' => $equipment->criticality_band?->value,
        ])->save();

        return $this->refreshBacklogState($workOrder->refresh());
    }

    public function release(WorkOrder $workOrder): WorkOrder
    {
        $this->transitionTo($workOrder, WorkOrderStatus::Released, [
            'released_on' => Carbon::now()->toDateString(),
        ]);

        return $this->refreshBacklogState($workOrder->refresh());
    }

    public function start(WorkOrder $workOrder, ?User $by = null): WorkOrder
    {
        return $this->transitionTo($workOrder, WorkOrderStatus::InProgress, array_filter([
            'started_on' => Carbon::now()->toDateString(),
            'assigned_to' => $by?->id ?? $workOrder->assigned_to,
        ]));
    }

    /**
     * Complete and close out.
     *
     * All four codes are required, and mandatory readings must have values.
     * Free text is stored in addition to the codes, never in place of them --
     * without the codes there is no reliability data to analyse later.
     *
     * @param  array{
     *   failure_mode: string, cause: string, detection_method: string, severity: string,
     *   planned_downtime_hours?: float, unplanned_downtime_hours?: float,
     *   acceptance_criteria_met?: bool, observations?: string,
     *   meter_at_completion?: float, completed_on?: Carbon, actual_cost?: float,
     * }  $closeout
     */
    public function complete(WorkOrder $workOrder, array $closeout, ?User $signedOffBy = null): WorkOrder
    {
        if (! $workOrder->status->allows(WorkOrderStatus::Completed)) {
            throw new MaintenanceRuleException(sprintf(
                'A work order that is %s cannot be completed.',
                $workOrder->status->value
            ));
        }

        $missing = $workOrder->missingMandatoryReadings();

        if ($missing > 0) {
            throw new MaintenanceRuleException(sprintf(
                '%d mandatory reading(s) have no recorded value. The work order cannot be completed until they are captured.',
                $missing
            ));
        }

        $codes = $this->resolveCodes($closeout);
        $completedOn = $closeout['completed_on'] ?? Carbon::now();

        return DB::transaction(function () use ($workOrder, $closeout, $codes, $completedOn, $signedOffBy) {
            WorkOrderCloseout::updateOrCreate(
                ['work_order_id' => $workOrder->id],
                $codes + [
                    'planned_downtime_hours' => $closeout['planned_downtime_hours'] ?? 0,
                    'unplanned_downtime_hours' => $closeout['unplanned_downtime_hours'] ?? 0,
                    'acceptance_criteria_met' => $closeout['acceptance_criteria_met'] ?? true,
                    'signed_off_by' => $signedOffBy?->id,
                    'completed_on' => $completedOn->toDateString(),
                    'meter_at_completion' => $closeout['meter_at_completion'] ?? null,
                    'observations' => $closeout['observations'] ?? null,
                ]
            );

            $workOrder->forceFill([
                'status' => WorkOrderStatus::Completed,
                'completed_on' => $completedOn->toDateString(),
                'meter_at_completion' => $closeout['meter_at_completion'] ?? null,
                'actual_cost' => $closeout['actual_cost'] ?? $workOrder->actual_cost,
                'backlog_state' => null,
            ])->save();

            // Roll the plan forward so the next due point is computed from this
            // completion, using the meter reading taken at the time.
            if ($workOrder->plan) {
                $this->plans->recordCompletion(
                    $workOrder->plan,
                    $completedOn,
                    $closeout['meter_at_completion'] ?? null,
                );
            }

            return $workOrder->refresh();
        });
    }

    public function close(WorkOrder $workOrder): WorkOrder
    {
        if (! $workOrder->closeout) {
            throw new MaintenanceRuleException('A work order cannot be closed before it has been completed.');
        }

        return $this->transitionTo($workOrder, WorkOrderStatus::Closed, ['closed_at' => now()]);
    }

    public function cancel(WorkOrder $workOrder, string $reason): WorkOrder
    {
        return $this->transitionTo($workOrder, WorkOrderStatus::Cancelled, [
            'remarks' => trim(($workOrder->remarks ? $workOrder->remarks."\n" : '').'Cancelled: '.$reason),
            'backlog_state' => null,
        ]);
    }

    /**
     * Which of the three backlog states this work order sits in. Reported
     * separately so the constraint reads as labour, procurement or operations.
     */
    public function refreshBacklogState(WorkOrder $workOrder): WorkOrder
    {
        if (! $workOrder->isOpen()) {
            $workOrder->forceFill(['backlog_state' => null])->save();

            return $workOrder->refresh();
        }

        $workOrder->loadMissing(['parts.part', 'equipment.vessel']);

        $state = match (true) {
            ! $workOrder->partsAvailable() => BacklogState::WaitingOnMaterial,
            $this->assetUnavailable($workOrder) => BacklogState::WaitingOnAssetAvailability,
            default => BacklogState::ReadyToExecute,
        };

        $workOrder->forceFill(['backlog_state' => $state])->save();

        return $workOrder->refresh();
    }

    // -- internals -----------------------------------------------------------

    protected function assetUnavailable(WorkOrder $workOrder): bool
    {
        $vessel = $workOrder->equipment?->vessel;

        return $vessel !== null && $vessel->status->value !== 'active';
    }

    protected function transitionTo(WorkOrder $workOrder, WorkOrderStatus $next, array $attributes = []): WorkOrder
    {
        if (! $workOrder->status->allows($next)) {
            throw new MaintenanceRuleException(sprintf(
                'A work order that is %s cannot move to %s.',
                $workOrder->status->value,
                $next->value
            ));
        }

        $workOrder->forceFill(['status' => $next] + $attributes)->save();

        return $workOrder->refresh();
    }

    /** @return array<string,int|null> */
    protected function resolveCodes(array $closeout): array
    {
        $map = [
            'failure_mode_code_id' => [FailureCode::TYPE_FAILURE_MODE, $closeout['failure_mode'] ?? null],
            'cause_code_id' => [FailureCode::TYPE_CAUSE, $closeout['cause'] ?? null],
            'detection_method_code_id' => [FailureCode::TYPE_DETECTION_METHOD, $closeout['detection_method'] ?? null],
            'severity_code_id' => [FailureCode::TYPE_SEVERITY, $closeout['severity'] ?? null],
        ];

        $resolved = [];
        $missing = [];

        foreach ($map as $column => [$type, $code]) {
            if (blank($code)) {
                $missing[] = str_replace('_', ' ', $type);

                continue;
            }

            $record = FailureCode::where('type', $type)->where('code', $code)->first();

            if (! $record) {
                throw new MaintenanceRuleException(sprintf('Unknown %s code "%s".', str_replace('_', ' ', $type), $code));
            }

            $resolved[$column] = $record->id;
        }

        if ($missing !== []) {
            throw new MaintenanceRuleException(
                'Close-out requires all four coded fields. Missing: '.implode(', ', $missing).'. '
                .'Free text is recorded in addition to the codes, not in place of them.'
            );
        }

        return $resolved;
    }

    protected function copyLines(WorkOrder $workOrder, $task): void
    {
        if (! $task) {
            return;
        }

        foreach ($task->readings as $reading) {
            $workOrder->readings()->create([
                'parameter' => $reading->parameter,
                'unit' => $reading->unit,
                'minimum' => $reading->minimum,
                'maximum' => $reading->maximum,
                'is_mandatory' => $reading->is_mandatory,
                'sort_order' => $reading->sort_order,
            ]);
        }

        foreach ($task->parts as $line) {
            $workOrder->parts()->create([
                'part_id' => $line->part_id,
                'planned_quantity' => $line->quantity,
                'line_type' => $line->line_type,
            ]);
        }

        if ($task->trade_id || $task->estimated_hours) {
            $workOrder->labour()->create([
                'trade_id' => $task->trade_id,
                'standard_hours' => $task->estimated_hours,
                'persons' => $task->persons_required ?? 1,
            ]);
        }
    }

    /** @return array<string,mixed>|null */
    protected function snapshot($task): ?array
    {
        if (! $task) {
            return null;
        }

        return [
            'captured_at' => now()->toIso8601String(),
            'code' => $task->code,
            'activity_description' => $task->activity_description,
            'section' => $task->section,
            'controlling_reference' => $task->controlling_reference,
            'acceptance_criteria' => $task->acceptance_criteria,
            'safety_instructions' => $task->safety_instructions,
            'permits_required' => $task->permits_required,
            'estimated_hours' => $task->estimated_hours,
            'persons_required' => $task->persons_required,
            'readings' => $task->readings->map(fn ($r) => [
                'parameter' => $r->parameter,
                'unit' => $r->unit,
                'minimum' => $r->minimum,
                'maximum' => $r->maximum,
            ])->all(),
            'parts' => $task->parts->map(fn ($p) => [
                'part_code' => $p->part?->code,
                'quantity' => $p->quantity,
                'line_type' => $p->line_type?->value,
            ])->all(),
        ];
    }

    protected function nextNumber(): string
    {
        $year = now()->format('Y');
        $prefix = 'WO-'.$year.'-';

        $last = WorkOrder::withTrashed()
            ->where('number', 'like', $prefix.'%')
            ->orderByDesc('number')
            ->value('number');

        $sequence = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
    }
}
