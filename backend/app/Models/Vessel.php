<?php

namespace App\Models;

use App\Enums\VesselStatus;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\hasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\ScopedToOperator;


class Vessel extends Model
{
    use BelongsToOrganisation, HasFactory, ScopedToOperator, SoftDeletes;

    protected $fillable = [
        'ship_type_id', 'code', 'name', 'registration_no', 'official_no',
        'commission_date', 'operating_zone', 'incharge_user_id', 'status', 'remarks',
		'operator_id', 'operator_from', 'operator_until', 'vessel_incharge_id'
    ];

    protected function casts(): array
    {
        return [
            'commission_date' => 'date',
			'operator_from'  => 'date',
			'operator_until' => 'date',
            'status' => VesselStatus::class,
        ];
    }

	
    public function shipType(): BelongsTo
    {
        return $this->belongsTo(ShipType::class);
    }

    public function inchargeUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'incharge_user_id');
    }

    public function equipment(): HasMany
    {
        return $this->hasMany(Equipment::class);
    }
	
	// Vessel carries the column itself, so the scope filters directly.
    public function operatorColumn(): string
    {
        return 'operator_id';
    }
	
	public function operator(): BelongsTo
	{
		return $this->belongsTo(Operator::class);
	}
	
	public function incharge(): BelongsTo
    {
        return $this->belongsTo(VesselIncharge::class, 'vessel_incharge_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(VesselAssignment::class);
    }

    public function currentAssignment(): HasOne
    {
        return $this->hasOne(VesselAssignment::class)->whereNull('assigned_until');
    }
}
