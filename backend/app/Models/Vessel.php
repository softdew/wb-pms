<?php

namespace App\Models;

use App\Enums\VesselStatus;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vessel extends Model
{
    use BelongsToOrganisation, HasFactory, SoftDeletes;

    protected $fillable = [
        'ship_type_id', 'code', 'name', 'registration_no', 'official_no',
        'commission_date', 'operating_zone', 'incharge_user_id', 'status', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'commission_date' => 'date',
            'status' => VesselStatus::class,
        ];
    }

    public function shipType(): BelongsTo
    {
        return $this->belongsTo(ShipType::class);
    }

    public function incharge(): BelongsTo
    {
        return $this->belongsTo(User::class, 'incharge_user_id');
    }

    public function equipment(): HasMany
    {
        return $this->hasMany(Equipment::class);
    }
}
