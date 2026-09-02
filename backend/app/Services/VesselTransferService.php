<?php

namespace App\Services;

use App\Exceptions\MaintenanceRuleException;
use App\Models\Equipment;
use App\Models\MaintenancePlan;
use App\Models\Operator;
use App\Models\User;
use App\Models\Vessel;
use App\Models\VesselAssignment;
use App\Models\VesselHandover;
use App\Models\VesselIncharge;
use App\Models\WorkOrder;
use App\Support\OperatorContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Moving a vessel from one operator to the next at the end of a tender.
 *
 * What moves is the assignment. The equipment, meter readings, criticality
 * assessments, plans, work orders and close-outs all stay exactly where they
 * are, because they belong to the vessel and the department owns the vessel.
 * That is the whole reason operators were built as a dimension inside the
 * tenant rather than as tenants of their own.
 */
class VesselTransferService
{
    public function __construct(protected OperatorContext $operators)
    {
    }

    /**
     * Record the first operator of a vessel, or a straightforward assignment
     * where there was none before.
     */
    public function assign(
        Vessel $vessel,
        Operator $operator,
        ?Carbon $from = null,
        array $options = [],
    ): VesselAssignment {
        if ($vessel->operator_id !== null) {
            throw new MaintenanceRuleException(sprintf(
                '%s is already assigned to %s. Use a transfer to move it.',
                $vessel->name,
                $vessel->operator?->name ?? 'an operator',
            ));
        }

        return DB::transaction(function () use ($vessel, $operator, $from, $options) {
            $assignment = $this->openAssignment($vessel, $operator, $from ?? now(), $options);

            $vessel->forceFill([
                'operator_id' => $operator->id,
                'operator_from' => $assignment->assigned_from,
                'operator_until' => $options['agreement_to'] ?? null,
                'vessel_incharge_id' => null,
            ])->save();

            return $assignment;
        });
    }

    /**
     * Hand a vessel over to a new operator.
     *
     * The handover record captures the position at the moment of transfer --
     * hours, open work orders, overdue tasks. That is what the outgoing and
     * incoming operators otherwise argue about, and it is written before
     * anything changes.
     */
    public function transfer(
        Vessel $vessel,
        Operator $toOperator,
        ?Carbon $on = null,
        array $options = [],
        ?User $recordedBy = null,
    ): VesselHandover {
        $on = $on ?? now();
        $fromOperator = $vessel->operator;

        if ($fromOperator && $fromOperator->id === $toOperator->id) {
            throw new MaintenanceRuleException(
                $vessel->name.' is already assigned to '.$toOperator->name.'.'
            );
        }

        return DB::transaction(function () use ($vessel, $fromOperator, $toOperator, $on, $options, $recordedBy) {
            // Snapshot first, while the outgoing operator still holds it.
            $position = $this->positionAt($vessel);

            $handover = VesselHandover::create([
                'vessel_id' => $vessel->id,
                'from_operator_id' => $fromOperator?->id,
                'to_operator_id' => $toOperator->id,
                'handed_over_on' => $on->toDateString(),
                'tender_reference' => $options['tender_reference'] ?? null,
                'meter_readings' => $position['meter_readings'],
                'open_work_orders' => $position['open_work_orders'],
                'overdue_tasks' => $position['overdue_tasks'],
                'outstanding' => $position['outstanding'],
                'condition_notes' => $options['condition_notes'] ?? null,
                'recorded_by' => $recordedBy?->id,
            ]);

            // Close the outgoing tenure.
            VesselAssignment::query()
                ->where('vessel_id', $vessel->id)
                ->current()
                ->update(['assigned_until' => $on->toDateString()]);

            $this->openAssignment($vessel, $toOperator, $on, $options, $recordedBy);

            $vessel->forceFill([
                'operator_id' => $toOperator->id,
                'operator_from' => $on->toDateString(),
                'operator_until' => $options['agreement_to'] ?? null,
                // The outgoing operator's chief engineer does not come with the
                // vessel. Left empty for the incoming operator to fill.
                'vessel_incharge_id' => null,
            ])->save();

            return $handover;
        });
    }

    /** Name the person in charge. Must be employed by the holding operator. */
    public function assignIncharge(Vessel $vessel, VesselIncharge $incharge): Vessel
    {
        if ($vessel->operator_id === null) {
            throw new MaintenanceRuleException(
                $vessel->name.' has no operator, so there is nobody to put in charge of it.'
            );
        }

        if ($incharge->operator_id !== $vessel->operator_id) {
            throw new MaintenanceRuleException(sprintf(
                '%s is on %s\'s records, not the operator currently holding %s.',
                $incharge->name,
                $incharge->operator?->name ?? 'another operator',
                $vessel->name,
            ));
        }

        $vessel->forceFill(['vessel_incharge_id' => $incharge->id])->save();

        VesselAssignment::query()
            ->where('vessel_id', $vessel->id)
            ->current()
            ->update(['vessel_incharge_id' => $incharge->id]);

        return $vessel->refresh();
    }

    /** Who held this vessel on a given date. */
    public function operatorOn(Vessel $vessel, Carbon $date): ?Operator
    {
        return VesselAssignment::query()
            ->where('vessel_id', $vessel->id)
            ->on($date)
            ->first()?->operator;
    }

    /**
     * A vessel's tenure history, most recent first. The answer to "who ran this
     * boat, and for how long".
     */
    public function history(Vessel $vessel)
    {
        return VesselAssignment::query()
            ->where('vessel_id', $vessel->id)
            ->with(['operator:id,code,name,type', 'incharge:id,name,licence_no'])
            ->orderByDesc('assigned_from')
            ->get();
    }

    /**
     * The position at this moment: readings, open work and overdue tasks.
     * Read unscoped, because the department records the handover and must see
     * the outgoing operator's data to do it.
     */
    protected function positionAt(Vessel $vessel): array
    {
        return $this->operators->unscoped(function () use ($vessel) {
            $equipmentIds = Equipment::where('vessel_id', $vessel->id)->pluck('id');

            $readings = Equipment::query()
                ->whereIn('id', $equipmentIds)
                ->whereNotNull('current_meter_reading')
                ->get(['code', 'name', 'meter_type', 'current_meter_reading', 'current_meter_reading_on'])
                ->map(fn (Equipment $e) => [
                    'equipment' => $e->code,
                    'name' => $e->name,
                    'meter_type' => $e->meter_type?->value,
                    'reading' => (float) $e->current_meter_reading,
                    'read_on' => $e->current_meter_reading_on?->toDateString(),
                ])->values()->all();

            $openOrders = WorkOrder::query()
                ->whereIn('equipment_id', $equipmentIds)
                ->open()
                ->get(['id', 'number', 'description', 'due_on', 'backlog_state']);

            $overdue = MaintenancePlan::query()
                ->whereIn('equipment_id', $equipmentIds)
                ->active()
                ->where('due_status', 'due')
                ->count();

            return [
                'meter_readings' => $readings,
                'open_work_orders' => $openOrders->count(),
                'overdue_tasks' => $overdue,
                'outstanding' => $openOrders->map(fn (WorkOrder $w) => [
                    'number' => $w->number,
                    'description' => $w->description,
                    'due_on' => $w->due_on?->toDateString(),
                    'state' => $w->backlog_state?->value,
                ])->values()->all(),
            ];
        });
    }

    protected function openAssignment(
        Vessel $vessel,
        Operator $operator,
        Carbon $from,
        array $options,
        ?User $recordedBy = null,
    ): VesselAssignment {
        return VesselAssignment::create([
            'vessel_id' => $vessel->id,
            'operator_id' => $operator->id,
            'assigned_from' => $from->toDateString(),
            'agreement_no' => $options['agreement_no'] ?? $operator->agreement_no,
            'tender_reference' => $options['tender_reference'] ?? $operator->tender_reference,
            'remarks' => $options['remarks'] ?? null,
            'recorded_by' => $recordedBy?->id,
        ]);
    }
}
