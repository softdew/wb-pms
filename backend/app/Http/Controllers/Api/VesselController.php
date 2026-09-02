<?php

namespace App\Http\Controllers\Api;

use App\Models\Vessel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class VesselController extends CrudController
{
    protected array $with = ['shipType', 'incharge'];

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
            'incharge_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', 'in:active,under_repair,laid_up,disposed'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
