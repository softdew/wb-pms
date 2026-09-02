<?php

namespace App\Http\Controllers\Api;

use App\Models\ChecklistTask;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

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
            'sort_order' => ['integer', 'min:0'],
            'default_interval_value' => ['nullable', 'numeric', 'min:0'],
            'default_interval_unit' => ['nullable', 'in:hours,days,weeks,months,years'],
            'first_interval_value' => ['nullable', 'numeric', 'min:0'],
            'default_trigger_class' => ['required', 'in:calendar,meter,condition,event,statutory'],
            'controlling_reference' => ['nullable', 'string', 'max:128'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'trade_id' => ['nullable', 'integer', 'exists:trades,id'],
            'persons_required' => ['nullable', 'integer', 'min:1'],
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
    }
}
