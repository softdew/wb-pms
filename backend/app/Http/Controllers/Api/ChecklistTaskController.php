<?php

namespace App\Http\Controllers\Api;

use App\Models\ChecklistTask;
use App\Models\Equipment;
use App\Models\MaintenancePlan;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The task library.
 *
 * One task defined once and applied to many assets. Proliferation of
 * single-use tasks is what makes a maintenance system unmaintainable, so reuse
 * is reported rather than left to hope.
 */
class ChecklistTaskController extends CrudController
{
    protected array $with = ['category', 'trade', 'readings', 'parts.part'];

    protected array $searchable = ['code', 'activity_description', 'controlling_reference'];

    protected string $orderBy = 'sort_order';

    protected function model(): string
    {
        return ChecklistTask::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:64'],
            'activity_description' => ['required', 'string', 'max:500'],
            'equipment_category_id' => ['nullable', 'integer', 'exists:equipment_categories,id'],
            'section' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['integer', 'min:0', 'max:9999'],
            'default_interval_value' => ['nullable', 'numeric', 'min:0'],
            'default_interval_unit' => ['nullable', 'in:hours,days,weeks,months,years'],
            'first_interval_value' => ['nullable', 'numeric', 'min:0'],
            'default_trigger_class' => ['required', 'in:calendar,meter,condition,event,statutory'],
            'controlling_reference' => ['nullable', 'string', 'max:128'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'trade_id' => ['nullable', 'integer', 'exists:trades,id'],
            'persons_required' => ['nullable', 'integer', 'min:1', 'max:99'],
            'safety_instructions' => ['nullable', 'string'],
            'permits_required' => ['nullable', 'string'],
            'acceptance_criteria' => ['nullable', 'string'],
            'criticality' => ['nullable', 'string', 'max:16'],
            'is_active' => ['boolean'],
        ];
    }

    protected function applyFilters(Request $request, Builder $query): void
    {
        if ($category = $request->integer('equipment_category_id')) {
            $query->where('equipment_category_id', $category);
        }

        if ($request->boolean('active_only')) {
            $query->active();
        }

        // How many assets each task is applied to. A library full of tasks used
        // once is a library nobody maintains.
        //
        // Counted as a raw subquery: withCount() with distinct() generates
        // "distinct on (...) count(*)", which PostgreSQL rejects.
        $query->addSelect([
            'applied_count' => MaintenancePlan::query()
                ->selectRaw('count(distinct equipment_id)')
                ->whereColumn('maintenance_plans.checklist_task_id', 'checklist_tasks.id')
                ->whereNull('maintenance_plans.deleted_at'),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $task = ChecklistTask::with($this->with)->findOrFail($id);

        return $this->ok([
            'task' => $task,
            'applied_to' => MaintenancePlan::query()
                ->where('checklist_task_id', $task->id)
                ->with(['equipment:id,code,name,vessel_id', 'equipment.vessel:id,code,name'])
                ->get(['id', 'equipment_id', 'trigger_class', 'applicable_interval_value', 'applicable_interval_unit', 'due_status']),
        ]);
    }

    /** Readings to capture on completion, with the limits they are judged against. */
    public function saveReadings(Request $request, int $id): JsonResponse
    {
        $task = ChecklistTask::findOrFail($id);

        $data = $request->validate([
            'readings' => ['present', 'array'],
            'readings.*.parameter' => ['required', 'string', 'max:255'],
            'readings.*.unit' => ['nullable', 'string', 'max:32'],
            'readings.*.minimum' => ['nullable', 'numeric'],
            'readings.*.maximum' => ['nullable', 'numeric'],
            'readings.*.is_mandatory' => ['boolean'],
        ]);

        DB::transaction(function () use ($task, $data) {
            $task->readings()->delete();

            foreach ($data['readings'] as $index => $reading) {
                $task->readings()->create($reading + ['sort_order' => ($index + 1) * 10]);
            }
        });

        return $this->ok($task->load('readings'));
    }

    /** Spares and consumables the task calls for. */
    public function saveParts(Request $request, int $id): JsonResponse
    {
        $task = ChecklistTask::findOrFail($id);

        $data = $request->validate([
            'parts' => ['present', 'array'],
            'parts.*.part_id' => ['required', 'integer', 'exists:parts,id'],
            'parts.*.quantity' => ['required', 'numeric', 'min:0'],
            'parts.*.line_type' => ['required', 'in:spare,consumable,special_tool'],
        ]);

        DB::transaction(function () use ($task, $data) {
            $task->parts()->delete();

            foreach ($data['parts'] as $line) {
                $task->parts()->create($line);
            }
        });

        return $this->ok($task->load('parts.part'));
    }

    /**
     * What applying the category library to an asset would produce.
     *
     * Shown before it happens, because applying twenty tasks to the wrong
     * engine is tedious to undo and easy to do.
     */
    public function previewForEquipment(int $equipmentId): JsonResponse
    {
        $equipment = Equipment::with(['category:id,code,name', 'vessel:id,code,name'])
            ->findOrFail($equipmentId);

        $existing = MaintenancePlan::query()
            ->where('equipment_id', $equipment->id)
            ->pluck('checklist_task_id')
            ->all();

        $library = $equipment->equipment_category_id
            ? ChecklistTask::query()
                ->active()
                ->forCategory($equipment->equipment_category_id)
                ->orderBy('sort_order')
                ->get()
            : collect();

        return $this->ok([
            'equipment' => [
                'id' => $equipment->id,
                'code' => $equipment->code,
                'name' => $equipment->name,
                'meter_type' => $equipment->meter_type?->value,
                'current_meter_reading' => $equipment->current_meter_reading,
                'criticality_band' => $equipment->criticality_band?->value,
                'category' => $equipment->category?->only(['id', 'code', 'name']),
                'vessel' => $equipment->vessel?->only(['id', 'code', 'name']),
            ],
            'tasks' => $library->map(fn (ChecklistTask $task) => [
                'id' => $task->id,
                'code' => $task->code,
                'activity_description' => $task->activity_description,
                'section' => $task->section,
                'interval_label' => $task->intervalLabel(),
                'trigger_class' => $task->default_trigger_class?->value,
                'controlling_reference' => $task->controlling_reference,
                'already_applied' => in_array($task->id, $existing, true),
                // A meter task needs a meter; the API would refuse it anyway.
                'blocked' => $task->default_trigger_class?->value === 'meter'
                    && $equipment->meter_type === null,
            ])->values(),
        ]);
    }
}
