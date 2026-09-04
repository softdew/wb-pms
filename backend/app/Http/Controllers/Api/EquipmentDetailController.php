<?php

namespace App\Http\Controllers\Api;

use App\Models\Equipment;
use App\Models\MaintenancePlan;
use App\Models\WorkOrder;
use App\Services\DueDateService;
use Illuminate\Http\JsonResponse;

/**
 * Everything the equipment page needs in one call: the item, its plans with
 * their computed positions, recent readings and open work.
 */
class EquipmentDetailController extends ApiController
{
    public function __construct(protected DueDateService $dueDates)
    {
    }

    public function show(int $id): JsonResponse
    {
        $equipment = Equipment::with([
            'vessel:id,code,name,operator_id',
            'vessel.operator:id,code,name',
            'location:id,code,name',
            'category:id,code,name',
            'model:id,make,model,oem',
            'parent:id,code,name',
        ])->findOrFail($id);

        $plans = MaintenancePlan::query()
            ->where('equipment_id', $equipment->id)
            ->active()
            ->with('task:id,code,activity_description,section,sort_order,controlling_reference')
            ->get()
            ->map(function (MaintenancePlan $plan) {
                $plan->setAttribute('interval_label', $plan->intervalLabel());
                $plan->setAttribute('interval_value', $plan->effectiveIntervalValue());
                $plan->setAttribute('consumed', $this->dueDates->consumedSinceCompletion($plan));
                $plan->setAttribute('remaining', $this->dueDates->remaining($plan));
                $plan->setAttribute('is_meter_based', $plan->isMeterBased());

                return $plan;
            })
            ->sortBy(fn (MaintenancePlan $plan) => $plan->task?->sort_order ?? 0)
            ->values();

        return $this->ok([
            'equipment' => $equipment,
            'plans' => $plans,
            'readings' => $equipment->meterReadings()->limit(12)->get(),
            'work_orders' => WorkOrder::query()
                ->where('equipment_id', $equipment->id)
                ->orderByDesc('id')
                ->limit(10)
                ->get(['id', 'number', 'description', 'type', 'status', 'due_on', 'backlog_state']),
            'children' => Equipment::query()
                ->where('parent_id', $equipment->id)
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'criticality_band']),
            'totals' => [
                'plans' => $plans->count(),
                'due' => $plans->where('due_status', 'due')->count(),
                'soon' => $plans->where('due_status', 'due_soon')->count(),
                'ok' => $plans->where('due_status', 'on_track')->count(),
            ],
        ]);
    }
}
