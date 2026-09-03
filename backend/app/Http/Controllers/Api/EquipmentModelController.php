<?php

namespace App\Http\Controllers\Api;

use App\Models\EquipmentModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * The make and model library. Populated from the organisation's asset records
 * and the OEM documentation supplied for the purpose.
 */
class EquipmentModelController extends CrudController
{
    protected array $with = ['category'];

    protected array $searchable = ['make', 'model', 'oem'];

    protected string $orderBy = 'make';

    protected function model(): string
    {
        return EquipmentModel::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'make' => ['required', 'string', 'max:128'],
            'model' => ['required', 'string', 'max:128'],
            'oem' => ['nullable', 'string', 'max:128'],
            'equipment_category_id' => ['nullable', 'integer', 'exists:equipment_categories,id'],
            'notes' => ['nullable', 'string'],
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
