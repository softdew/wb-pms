<?php

namespace App\Http\Controllers\Api;

use App\Models\PartCategory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PartCategoryController extends CrudController
{
    protected function model(): string
    {
        return PartCategory::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:32'],
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ];
    }
}
