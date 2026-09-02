<?php

namespace App\Http\Controllers\Api;

use App\Models\Equipment;
use App\Models\Vessel;
use App\Services\DueDateService;
use App\Services\VesselTransferService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VesselController extends CrudController
{
    protected array $with = ['shipType', 'operator', 'incharge'];

    public function __construct(
        protected DueDateService $dueDates,
        protected VesselTransferService $transfers,
    ) {
    }

    protected function model(): string
    {
        return Vessel::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:32'],
            'name' => ['required', 'string', 'max:255'],
            'ship_type_id' => ['nullable', 'integer', 'exists:ship_types,id'],
            'registration_no' => ['nullable', 'string', 'max:64'],
            'official_no' => ['nullable', 'string', 'max:64'],
            'commission_date' => ['nullable', 'date'],
            'operating_zone' => ['nullable', 'in:river,coastal,offshore'],
            'status' => ['nullable', 'in:active,under_repair,laid_up,disposed'],
            'remarks' => ['nullable', 'string'],
        ];
    }

    protected function applyFilters(Request $request, Builder $query): void
    {
        if ($operator = $request->integer('operator_id')) {
            $query->where('operator_id', $operator);
        }

        if ($status = $request->string('status')->value()) {
            $query->where('status', $status);
        }
    }

    /**
     * Everything the vessel page needs in one call: the equipment fitted, each
     * item's meter position, and the count of tasks in each due state.
     */
    public function overview(int $id): JsonResponse
    {
        $vessel = Vessel::with(['shipType', 'operator', 'incharge', 'currentAssignment.operator'])
            ->findOrFail($id);

        $equipment = Equipment::query()
            ->where('vessel_id', $vessel->id)
            ->with(['category:id,code,name', 'model:id,make,model'])
            ->orderBy('code')
            ->get()
            ->map(function (Equipment $item) {
                $plans = $item->maintenancePlans()->active()->get();

                return [
                    'id' => $item->id,
                    'code' => $item->code,
                    'name' => $item->name,
                    'serial_no' => $item->serial_no,
                    'category' => $item->category?->only(['id', 'code', 'name']),
                    'make_model' => $item->model
                        ? trim($item->model->make.' '.$item->model->model)
                        : null,
                    'criticality_band' => $item->criticality_band?->value,
                    'criticality_index' => $item->criticality_index,
                    'maintenance_strategy' => $item->maintenance_strategy?->value,
                    'hidden_failure_flag' => $item->hidden_failure_flag,
                    'meter_type' => $item->meter_type?->value,
                    'current_meter_reading' => $item->current_meter_reading,
                    'current_meter_reading_on' => $item->current_meter_reading_on?->toDateString(),
                    'warranty_expiry_date' => $item->warranty_expiry_date?->toDateString(),
                    'due' => $plans->where('due_status', 'due')->count(),
                    'soon' => $plans->where('due_status', 'due_soon')->count(),
                    'ok' => $plans->where('due_status', 'on_track')->count(),
                    'plans' => $plans->count(),
                ];
            });

        return $this->ok([
            'vessel' => $vessel,
            'equipment' => $equipment,
            'totals' => [
                'equipment' => $equipment->count(),
                'plans' => $equipment->sum('plans'),
                'due' => $equipment->sum('due'),
                'soon' => $equipment->sum('soon'),
                'ok' => $equipment->sum('ok'),
            ],
        ]);
    }

    /** Who has held this vessel, and for how long. */
    public function history(int $id): JsonResponse
    {
        return $this->ok($this->transfers->history(Vessel::findOrFail($id)));
    }
}
