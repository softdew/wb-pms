<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;


class ShipType extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'code',
        'name',
        'category',
        'capacity_particulars',
        'operating_zone',
        'remarks',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
