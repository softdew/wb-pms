<?php

namespace App\Http\Controllers\Api;

use App\Models\ShipType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ShipTypeController extends CrudController
{
    protected function model(): string
    {
        return ShipType::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:32'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:64'],
            'capacity_particulars' => ['nullable', 'string', 'max:255'],
            'operating_zone' => ['nullable', 'in:river,coastal,offshore'],
            'remarks' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
