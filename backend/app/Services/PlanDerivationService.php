<?php

namespace App\Services;

use App\Enums\IntervalUnit;
use App\Enums\TriggerClass;
use App\Exceptions\MaintenanceRuleException;
use App\Models\ChecklistTask;
use App\Models\Equipment;
use App\Models\MaintenancePlan;
use Illuminate\Support\Collection;

/**
 * Applying the library to an asset.
 *
 * Where OEM, statutory and failure-history values are all known, the shortest
 * is applied by default. Anything longer is a deliberate departure and must
 * carry a reason, which is then visible for review.
 */
class PlanDerivationService
{
    public function __construct(protected DueDateService $dueDates)
    {
    }

    /**
     * @param  array{
     *     trigger_class?: TriggerClass,
     *     oem?: float, statutory?: float, history?: float,
     *     applicable?: float, unit?: IntervalUnit, reason?: string,
     *     first_interval?: float, statutory_outer_limit?: float,
     *     condition_parameter?: string, condition_limit?: float,
     *     release_lead_days?: int, warning_window?: float,
     *     last_done_on?: \Illuminate\Support\Carbon, last_done_meter_reading?: float,
     * }  $options
     */
    public function apply(Equipment $equipment, ChecklistTask $task, array $options = []): MaintenancePlan
    {
        $trigger = $options['trigger_class'] ?? $task->default_trigger_class ?? TriggerClass::Calendar;
        $unit = $options['unit'] ?? $task->default_interval_unit;

        $this->guardTrigger($equipment, $trigger, $unit, $options);

        $sources = array_filter([
            'oem' => $options['oem'] ?? ($task->default_interval_value !== null ? (float) $task->default_interval_value : null),
            'statutory' => $options['statutory'] ?? null,
            'history' => $options['history'] ?? null,
        ], fn ($v) => $v !== null);

        $applicable = $options['applicable'] ?? ($sources !== [] ? min($sources) : null);

        if ($sources !== [] && $applicable > min($sources) && empty($options['reason'])) {
            throw new MaintenanceRuleException(sprintf(
                'An interval of %s is longer than the shortest source value of %s. '
                .'Record the reason for the departure.',
                $applicable, min($sources)
            ));
        }

        $plan = MaintenancePlan::updateOrCreate(
            [
                'equipment_id' => $equipment->id,
                'checklist_task_id' => $task->id,
                'trigger_class' => $trigger,
            ],
            [
                'oem_interval_value' => $sources['oem'] ?? null,
                'statutory_interval_value' => $sources['statutory'] ?? null,
                'history_interval_value' => $sources['history'] ?? null,
                'applicable_interval_value' => $applicable,
                'applicable_interval_unit' => $unit,
                'interval_reason' => $options['reason'] ?? null,
                'first_interval_value' => $options['first_interval']
                    ?? ($task->first_interval_value !== null ? (float) $task->first_interval_value : null),
                'statutory_outer_limit' => $options['statutory_outer_limit'] ?? null,
                'condition_parameter' => $options['condition_parameter'] ?? null,
                'condition_limit' => $options['condition_limit'] ?? null,
                'release_lead_days' => $options['release_lead_days'] ?? $this->deriveLeadDays($task),
                'warning_window' => $options['warning_window'] ?? null,
                'last_done_on' => $options['last_done_on'] ?? null,
                'last_done_meter_reading' => $options['last_done_meter_reading'] ?? null,
                'status' => MaintenancePlan::STATUS_ACTIVE,
            ]
        );

        return $this->dueDates->recompute($plan);
    }

    /**
     * Apply every active library task for the asset's category. The bulk action
     * that makes onboarding a vessel tractable rather than a week of typing.
     *
     * @return Collection<int, MaintenancePlan>
     */
    public function applyCategoryLibrary(Equipment $equipment, array $options = []): Collection
    {
        if (! $equipment->equipment_category_id) {
            throw new MaintenanceRuleException(
                'This asset has no equipment category, so there is no library to apply.'
            );
        }

        return ChecklistTask::query()
            ->active()
            ->forCategory($equipment->equipment_category_id)
            ->get()
            ->map(fn (ChecklistTask $task) => $this->apply($equipment, $task, $options));
    }

    /** Record a completion and roll the plan forward. */
    public function recordCompletion(
        MaintenancePlan $plan,
        ?\Illuminate\Support\Carbon $completedOn = null,
        ?float $meterReading = null,
    ): MaintenancePlan {
        $completedOn = $completedOn ?? now();

        if ($plan->isMeterBased() && $meterReading === null) {
            $meterReading = $plan->equipment->current_meter_reading !== null
                ? (float) $plan->equipment->current_meter_reading
                : null;

            if ($meterReading === null) {
                throw new MaintenanceRuleException(
                    'A meter-based task needs the meter reading taken at completion. '
                    .'Without it, hours since the last completion cannot be calculated.'
                );
            }
        }

        $plan->forceFill([
            'last_done_on' => $completedOn->toDateString(),
            'last_done_meter_reading' => $meterReading,
        ])->save();

        return $this->dueDates->recompute($plan->refresh());
    }

    /** Longest part lead time on the task, falling back to the org default. */
    protected function deriveLeadDays(ChecklistTask $task): ?int
    {
        $longest = $task->longestPartLeadTimeDays();

        return $longest > 0 ? $longest : null;
    }

    protected function guardTrigger(Equipment $equipment, TriggerClass $trigger, ?IntervalUnit $unit, array $options): void
    {
        if ($trigger === TriggerClass::Meter) {
            if (! $equipment->isMetered()) {
                throw new MaintenanceRuleException(
                    'A meter-based task cannot be planned against an asset with no meter defined.'
                );
            }

            if ($unit?->isMeterBased() !== true) {
                throw new MaintenanceRuleException(
                    'A meter-based task must carry an interval in hours, not a calendar unit.'
                );
            }
        }

        if ($trigger === TriggerClass::Condition && empty($options['condition_parameter'])) {
            throw new MaintenanceRuleException(
                'A condition trigger needs the parameter being watched and the limit that raises the task.'
            );
        }

        if ($trigger === TriggerClass::Calendar && $unit?->isMeterBased() === true) {
            throw new MaintenanceRuleException(
                'A calendar task cannot carry an interval in hours.'
            );
        }
    }
}
