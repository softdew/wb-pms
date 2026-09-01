<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;


class Location extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'code',
        'name',
        'type',
        'is_store',
        'address',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_store' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
