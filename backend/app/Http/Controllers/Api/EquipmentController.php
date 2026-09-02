<?php

namespace App\Http\Controllers\Api;

use App\Enums\MaintenanceStrategy;
use App\Models\Equipment;
use App\Services\MaintenanceStrategyService;
use App\Services\MeterReadingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class EquipmentController extends CrudController
{
    protected array $with = ['vessel', 'location', 'category', 'model', 'parent'];

    protected array $searchable = ['code', 'name', 'serial_no'];

    public function __construct(
        protected MeterReadingService $meters,
        protected MaintenanceStrategyService $strategies,
    ) {
    }

    protected function model(): string
    {
        return Equipment::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:64'],
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:equipment,id'],
            'taxonomy_level' => ['nullable', 'in:installation,system,equipment_unit,sub_unit,component'],
            'vessel_id' => ['nullable', 'required_without:location_id', 'integer', 'exists:vessels,id'],
            'location_id' => ['nullable', 'required_without:vessel_id', 'integer', 'exists:locations,id'],
            'equipment_category_id' => ['nullable', 'integer', 'exists:equipment_categories,id'],
            'equipment_model_id' => ['nullable', 'integer', 'exists:equipment_models,id'],
            'serial_no' => ['nullable', 'string', 'max:128'],
            'installation_date' => ['nullable', 'date'],
            'last_renewal_date' => ['nullable', 'date'],
            'warranty_expiry_date' => ['nullable', 'date'],
            'duty_status' => ['nullable', 'in:duty,standby,spare'],
            'meter_type' => ['nullable', 'in:running_hours,cycles,sailings'],
            'statutory_item_ref' => ['nullable', 'string', 'max:128'],
            'replacement_value' => ['nullable', 'numeric', 'min:0'],
            'hidden_failure_flag' => ['boolean'],
            'status' => ['nullable', 'string', 'max:32'],
            'remarks' => ['nullable', 'string'],
        ];
    }

    protected function applyFilters(Request $request, Builder $query): void
    {
        if ($vessel = $request->integer('vessel_id')) {
            $query->where('vessel_id', $vessel);
        }

        if ($band = $request->string('criticality_band')->value()) {
            $query->where('criticality_band', $band);
        }

        if ($request->boolean('awaiting_criticality')) {
            $query->whereNull('criticality_band');
        }
    }

    /** Record a meter reading. Never a direct write to the running total. */
    public function recordMeterReading(Request $request, int $id): JsonResponse
    {
        $equipment = Equipment::findOrFail($id);

        $data = $request->validate([
            'reading_value' => ['required', 'numeric', 'min:0'],
            'reading_on' => ['nullable', 'date'],
            'is_reset' => ['boolean'],
            'remarks' => ['required_if:is_reset,true', 'nullable', 'string'],
        ]);

        $reading = $this->meters->record(
            $equipment,
            (float) $data['reading_value'],
            isset($data['reading_on']) ? Carbon::parse($data['reading_on']) : null,
            $request->user(),
            $request->boolean('is_reset'),
            $data['remarks'] ?? null,
        );

        return $this->ok(['reading' => $reading, 'equipment' => $equipment->refresh()], 201);
    }

    public function meterReadings(int $id): JsonResponse
    {
        return $this->ok(Equipment::findOrFail($id)->meterReadings()->paginate(50));
    }

    /**
     * Assign the maintenance strategy. The service refuses run-to-failure on a
     * hidden failure mode or a statutory item whatever the request says.
     */
    public function assignStrategy(Request $request, int $id): JsonResponse
    {
        $equipment = Equipment::findOrFail($id);

        $data = $request->validate([
            'strategy' => ['required', 'in:analysis_derived,time_or_usage_based,inspect_and_run_to_failure'],
            'conditions' => ['array'],
            'conditions.consequence_tolerable' => ['boolean'],
            'conditions.failure_evident' => ['boolean'],
            'conditions.spare_held_or_cheap' => ['boolean'],
            'conditions.no_statutory_requirement' => ['boolean'],
        ]);

        return $this->ok($this->strategies->assign(
            $equipment,
            MaintenanceStrategy::from($data['strategy']),
            $data['conditions'] ?? [],
        ));
    }
}
