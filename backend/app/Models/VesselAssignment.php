<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One period of one operator holding one vessel. The open row -- assigned_until
 * null -- is the current tenure.
 */
class VesselAssignment extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'vessel_id', 'operator_id', 'assigned_from', 'assigned_until',
        'agreement_no', 'tender_reference', 'vessel_incharge_id',
        'remarks', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'assigned_from' => 'date',
            'assigned_until' => 'date',
        ];
    }

    public function vessel(): BelongsTo
    {
        return $this->belongsTo(Vessel::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(Operator::class);
    }

    public function incharge(): BelongsTo
    {
        return $this->belongsTo(VesselIncharge::class, 'vessel_incharge_id');
    }

    public function isCurrent(): bool
    {
        return $this->assigned_until === null;
    }

    public function scopeCurrent(Builder $query): Builder
    {
        return $query->whereNull('assigned_until');
    }

    /** Whoever held the vessel on a given date. */
    public function scopeOn(Builder $query, Carbon $date): Builder
    {
        return $query->whereDate('assigned_from', '<=', $date->toDateString())
            ->where(fn (Builder $q) => $q
                ->whereNull('assigned_until')
                ->orWhereDate('assigned_until', '>=', $date->toDateString()));
    }
}
