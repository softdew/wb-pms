<?php

namespace App\Models;

use App\Enums\OperatorType;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Operator extends Model
{
    use BelongsToOrganisation, HasFactory, SoftDeletes;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_ENDED = 'ended';

    protected $fillable = [
        'code', 'name', 'type',
        'agreement_no', 'tender_reference', 'agreement_from', 'agreement_to',
        'contact_name', 'contact_designation', 'contact_phone', 'contact_email',
        'address', 'remarks', 'status',
    ];

    protected function casts(): array
    {
        return [
            'type' => OperatorType::class,
            'agreement_from' => 'date',
            'agreement_to' => 'date',
        ];
    }

    public function vessels(): HasMany
    {
        return $this->hasMany(Vessel::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isDepartment(): bool
    {
        return $this->type === OperatorType::Department;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
	
	public function incharges(): HasMany
    {
        return $this->hasMany(VesselIncharge::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(VesselAssignment::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
