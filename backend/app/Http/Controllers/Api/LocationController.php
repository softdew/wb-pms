<?php

namespace App\Http\Controllers\Api;

use App\Models\Location;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class LocationController extends CrudController
{
    protected function model(): string
    {
        return Location::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:32'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:ghat,terminal,workshop,store,office'],
            'is_store' => ['boolean'],
            'address' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
