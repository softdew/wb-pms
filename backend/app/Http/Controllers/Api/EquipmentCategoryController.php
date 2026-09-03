<?php

namespace App\Http\Controllers\Api;

use App\Models\EquipmentCategory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class EquipmentCategoryController extends CrudController
{
    protected array $with = ['parent'];

    protected function model(): string
    {
        return EquipmentCategory::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:32'],
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:equipment_categories,id'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
