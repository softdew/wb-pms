<?php

namespace App\Http\Controllers\Api;

use App\Enums\BacklogState;
use App\Models\Equipment;
use App\Models\MaintenancePlan;
use App\Models\WorkOrder;
use App\Services\StockService;
use App\Services\WorkOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class WorkOrderController extends ApiController
{
    public function __construct(
        protected WorkOrderService $workOrders,
        protected StockService $stock,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = WorkOrder::query()->with(['equipment:id,code,name', 'assignee:id,name', 'vendor:id,code,name']);

        if ($status = $request->string('status')->value()) {
            $query->where('status', $status);
        }

        if ($request->boolean('open_only')) {
            $query->open();
        }

        if ($request->boolean('overdue')) {
            $query->overdue();
        }

        if ($state = $request->string('backlog_state')->value()) {
            $query->inBacklogState(BacklogState::from($state));
        }

        if ($equipment = $request->integer('equipment_id')) {
            $query->where('equipment_id', $equipment);
        }

        return $this->ok($query->orderByDesc('due_on')->paginate(min($request->integer('per_page', 25), 100)));
    }

    public function show(int $id): JsonResponse
    {
        return $this->ok(
            WorkOrder::with(['equipment', 'plan', 'readings', 'parts.part', 'labour.trade', 'closeout', 'stockTransactions'])
                ->findOrFail($id)
        );
    }

    public function storeFromPlan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'maintenance_plan_id' => ['required', 'integer', 'exists:maintenance_plans,id'],
            'executing_entity' => ['nullable', 'in:own_workshop,operator_crew,contractor'],
            'permit_reference' => ['nullable', 'string', 'max:128'],
        ]);

        $workOrder = $this->workOrders->raiseFromPlan(
            MaintenancePlan::findOrFail($data['maintenance_plan_id']),
            array_filter($data, fn ($v, $k) => $k !== 'maintenance_plan_id' && $v !== null, ARRAY_FILTER_USE_BOTH),
        );

        return $this->ok($workOrder, 201);
    }

    public function storeBreakdown(Request $request): JsonResponse
    {
        $data = $request->validate([
            'equipment_id' => ['required', 'integer', 'exists:equipment,id'],
            'description' => ['required', 'string', 'max:500'],
            'due_on' => ['nullable', 'date'],
            'executing_entity' => ['nullable', 'in:own_workshop,operator_crew,contractor'],
        ]);

        return $this->ok($this->workOrders->raiseBreakdown(
            Equipment::findOrFail($data['equipment_id']),
            $data['description'],
            $data,
        ), 201);
    }

    public function release(int $id): JsonResponse
    {
        return $this->ok($this->workOrders->release(WorkOrder::findOrFail($id)));
    }

    public function start(Request $request, int $id): JsonResponse
    {
        return $this->ok($this->workOrders->start(WorkOrder::findOrFail($id), $request->user()));
    }

    /** Capture a reading against a work order line, judged on its own limits. */
    public function captureReading(Request $request, int $id, int $readingId): JsonResponse
    {
        $workOrder = WorkOrder::findOrFail($id);
        $reading = $workOrder->readings()->findOrFail($readingId);

        $data = $request->validate([
            'value' => ['required', 'numeric'],
            'observation' => ['nullable', 'string'],
        ]);

        return $this->ok($reading->capture((float) $data['value'], $data['observation'] ?? null));
    }

    /**
     * Complete with close-out. All four codes are required; the service refuses
     * anything less, and free text is stored in addition to them.
     */
    public function complete(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'failure_mode' => ['required', 'string', 'max:32'],
            'cause' => ['required', 'string', 'max:32'],
            'detection_method' => ['required', 'string', 'max:32'],
            'severity' => ['required', 'string', 'max:32'],
            'planned_downtime_hours' => ['nullable', 'numeric', 'min:0'],
            'unplanned_downtime_hours' => ['nullable', 'numeric', 'min:0'],
            'acceptance_criteria_met' => ['boolean'],
            'meter_at_completion' => ['nullable', 'numeric', 'min:0'],
            'completed_on' => ['nullable', 'date'],
            'actual_cost' => ['nullable', 'numeric', 'min:0'],
            'observations' => ['nullable', 'string'],
        ]);

        if (isset($data['completed_on'])) {
            $data['completed_on'] = Carbon::parse($data['completed_on']);
        }

        return $this->ok($this->workOrders->complete(
            WorkOrder::findOrFail($id),
            $data,
            $request->user(),
        ));
    }

    public function close(int $id): JsonResponse
    {
        return $this->ok($this->workOrders->close(WorkOrder::findOrFail($id)));
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string']]);

        return $this->ok($this->workOrders->cancel(WorkOrder::findOrFail($id), $data['reason']));
    }

    public function issueParts(Request $request, int $id): JsonResponse
    {
        $workOrder = WorkOrder::findOrFail($id);
        $issued = $this->stock->issueForWorkOrder($workOrder, $request->user());

        return $this->ok(['issued_lines' => $issued, 'work_order' => $workOrder->refresh()]);
    }

    /**
     * Backlog in its three states, each with its own count and ageing, so the
     * constraint reads as labour, procurement or operations.
     */
    public function backlog(): JsonResponse
    {
        $summary = [];

        foreach (BacklogState::cases() as $state) {
            $orders = WorkOrder::inBacklogState($state)->get(['id', 'number', 'due_on']);

            $summary[$state->value] = [
                'label' => $state->label(),
                'count' => $orders->count(),
                'oldest_due_on' => $orders->min('due_on'),
                'overdue' => $orders->filter(fn ($o) => $o->due_on && $o->due_on->isPast())->count(),
            ];
        }

        return $this->ok($summary);
    }
}
