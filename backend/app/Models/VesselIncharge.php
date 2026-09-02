<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class VesselIncharge extends Model
{
    use BelongsToOrganisation, HasFactory, SoftDeletes;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    protected $fillable = [
        'operator_id', 'name', 'designation',
        'licence_no', 'licence_type', 'licence_issued_on', 'licence_valid_until',
        'licence_issuing_authority', 'phone', 'email', 'user_id', 'status', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'licence_issued_on' => 'date',
            'licence_valid_until' => 'date',
        ];
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(Operator::class);
    }

    public function vessels(): HasMany
    {
        return $this->hasMany(Vessel::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(VesselAssignment::class);
    }

    // -- licence -------------------------------------------------------------

    public function hasLicenceOnRecord(): bool
    {
        return filled($this->licence_no);
    }

    public function licenceHasExpired(?Carbon $on = null): bool
    {
        return $this->licence_valid_until !== null
            && $this->licence_valid_until->lt($on ?? now());
    }

    /** Within the given window of expiry, so it can be renewed in time. */
    public function licenceExpiresWithin(int $days = 60): bool
    {
        return $this->licence_valid_until !== null
            && ! $this->licenceHasExpired()
            && $this->licence_valid_until->lte(now()->addDays($days));
    }

    /**
     * Reported, not enforced. Whether a lapsed licence should stop a vessel
     * sailing is the department's decision, not the software's.
     */
    public function scopeWithExpiredLicence(Builder $query): Builder
    {
        return $query->whereNotNull('licence_valid_until')
            ->whereDate('licence_valid_until', '<', now()->toDateString());
    }

    public function scopeWithLicenceExpiringWithin(Builder $query, int $days = 60): Builder
    {
        return $query->whereNotNull('licence_valid_until')
            ->whereDate('licence_valid_until', '>=', now()->toDateString())
            ->whereDate('licence_valid_until', '<=', now()->addDays($days)->toDateString());
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
}
