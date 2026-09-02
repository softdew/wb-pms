<?php

namespace App\Http\Controllers\Api;

use App\Enums\IntervalUnit;
use App\Enums\TriggerClass;
use App\Models\ChecklistTask;
use App\Models\Equipment;
use App\Models\MaintenancePlan;
use App\Services\DueDateService;
use App\Services\PlanDerivationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MaintenancePlanController extends ApiController
{
    public function __construct(
        protected PlanDerivationService $plans,
        protected DueDateService $dueDates,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = MaintenancePlan::query()
            ->with([
                'equipment:id,code,name,vessel_id,current_meter_reading,meter_type',
                'equipment.vessel:id,code,name',
                'task:id,code,activity_description,section,sort_order,controlling_reference',
            ]);

        if ($equipment = $request->integer('equipment_id')) {
            $query->where('equipment_id', $equipment);
        }

        if ($vessel = $request->integer('vessel_id')) {
            $query->whereHas('equipment', fn ($q) => $q->where('vessel_id', $vessel));
        }

        if ($status = $request->string('due_status')->value()) {
            $query->where('due_status', $status);
        }

        if ($request->boolean('active_only', true)) {
            $query->active();
        }

        $plans = $query->orderBy('next_due_on')
            ->paginate(min($request->integer('per_page', 50), 500));

        // How far through its interval each task is. Computed rather than
        // stored, because it moves with every meter reading -- and the fleet
        // view is unreadable without it.
        $plans->getCollection()->transform(function (MaintenancePlan $plan) {
            $plan->setAttribute('interval_value', $plan->effectiveIntervalValue());
            $plan->setAttribute('interval_label', $plan->intervalLabel());
            $plan->setAttribute('consumed', $this->dueDates->consumedSinceCompletion($plan));
            $plan->setAttribute('remaining', $this->dueDates->remaining($plan));
            $plan->setAttribute('is_meter_based', $plan->isMeterBased());

            return $plan;
        });

        return $this->ok($plans);
    }

    public function show(int $id): JsonResponse
    {
        $plan = MaintenancePlan::with(['equipment.vessel', 'task.readings', 'task.parts.part'])
            ->findOrFail($id);

        return $this->ok([
            'plan' => $plan,
            'schedule' => $this->dueDates->sheetRow($plan),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'equipment_id' => ['required', 'integer', 'exists:equipment,id'],
            'checklist_task_id' => ['required', 'integer', 'exists:checklist_tasks,id'],
            'trigger_class' => ['nullable', 'in:calendar,meter,condition,event,statutory'],
            'interval_unit' => ['nullable', 'in:hours,days,weeks,months,years'],
            'oem_interval_value' => ['nullable', 'numeric', 'min:0'],
            'statutory_interval_value' => ['nullable', 'numeric', 'min:0'],
            'history_interval_value' => ['nullable', 'numeric', 'min:0'],
            'applicable_interval_value' => ['nullable', 'numeric', 'min:0'],
            'interval_reason' => ['nullable', 'string'],
            'first_interval_value' => ['nullable', 'numeric', 'min:0'],
            'statutory_outer_limit' => ['nullable', 'numeric', 'min:0'],
            'condition_parameter' => ['nullable', 'string', 'max:255'],
            'condition_limit' => ['nullable', 'numeric'],
            'release_lead_days' => ['nullable', 'integer', 'min:0'],
            'warning_window' => ['nullable', 'numeric', 'min:0'],
            'last_done_on' => ['nullable', 'date'],
            'last_done_meter_reading' => ['nullable', 'numeric', 'min:0'],
        ]);

        $plan = $this->plans->apply(
            Equipment::findOrFail($data['equipment_id']),
            ChecklistTask::findOrFail($data['checklist_task_id']),
            array_filter([
                'trigger_class' => isset($data['trigger_class']) ? TriggerClass::from($data['trigger_class']) : null,
                'unit' => isset($data['interval_unit']) ? IntervalUnit::from($data['interval_unit']) : null,
                'oem' => $data['oem_interval_value'] ?? null,
                'statutory' => $data['statutory_interval_value'] ?? null,
                'history' => $data['history_interval_value'] ?? null,
                'applicable' => $data['applicable_interval_value'] ?? null,
                'reason' => $data['interval_reason'] ?? null,
                'first_interval' => $data['first_interval_value'] ?? null,
                'statutory_outer_limit' => $data['statutory_outer_limit'] ?? null,
                'condition_parameter' => $data['condition_parameter'] ?? null,
                'condition_limit' => $data['condition_limit'] ?? null,
                'release_lead_days' => $data['release_lead_days'] ?? null,
                'warning_window' => $data['warning_window'] ?? null,
                'last_done_on' => isset($data['last_done_on']) ? Carbon::parse($data['last_done_on']) : null,
                'last_done_meter_reading' => $data['last_done_meter_reading'] ?? null,
            ], fn ($v) => $v !== null),
        );

        return $this->ok($plan, 201);
    }

    public function applyLibrary(Request $request, int $equipmentId): JsonResponse
    {
        $created = $this->plans->applyCategoryLibrary(Equipment::findOrFail($equipmentId));

        return $this->ok(['applied' => $created->count(), 'plans' => $created], 201);
    }

    public function suspend(int $id): JsonResponse
    {
        $plan = MaintenancePlan::findOrFail($id);
        $plan->update(['status' => MaintenancePlan::STATUS_SUSPENDED]);

        return $this->ok($plan);
    }

    public function resume(int $id): JsonResponse
    {
        $plan = MaintenancePlan::findOrFail($id);
        $plan->update(['status' => MaintenancePlan::STATUS_ACTIVE]);

        return $this->ok($this->dueDates->recompute($plan));
    }
}
