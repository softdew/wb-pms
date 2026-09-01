<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;


class Vendor extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'code',
        'name',
        'category',
        'contract_no',
        'contract_valid_from',
        'contract_valid_to',
        'contact_name',
        'contact_phone',
        'contact_email',
        'address',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'contract_valid_from' => 'date',
            'contract_valid_to' => 'date',
        ];
    }

    public function serviceRates(): HasMany
    {
        return $this->hasMany(ServiceRate::class);
    }
}
