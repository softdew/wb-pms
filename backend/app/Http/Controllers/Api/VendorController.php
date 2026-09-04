<?php

namespace App\Http\Controllers\Api;

use App\Models\Vendor;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class VendorController extends CrudController
{
    protected array $searchable = ['code', 'name', 'contract_no'];

    protected function model(): string
    {
        return Vendor::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:32'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:64'],
            'contract_no' => ['nullable', 'string', 'max:64'],
            'contract_valid_from' => ['nullable', 'date'],
            'contract_valid_to' => ['nullable', 'date', 'after_or_equal:contract_valid_from'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:32'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'status' => ['nullable', 'in:empanelled,suspended,expired'],
        ];
    }

    protected function applyFilters(Request $request, Builder $query): void
    {
        if ($status = $request->string('status')->value()) {
            $query->where('status', $status);
        }
    }
}
