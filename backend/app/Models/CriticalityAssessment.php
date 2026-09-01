<?php

namespace App\Models;

use App\Enums\AssessmentStatus;
use App\Enums\CriticalityBand;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One scoring event. The band an assessment was approved under is frozen here
 * along with the thresholds in force at the time, so recalibrating the bands
 * later does not silently rewrite past decisions.
 */
class CriticalityAssessment extends Model
{
    use BelongsToOrganisation, HasFactory;

    public const TRIGGER_INITIAL = 'initial';
    public const TRIGGER_MODIFICATION = 'modification';
    public const TRIGGER_DUTY_CHANGE = 'duty_change';
    public const TRIGGER_REPEATED_FAILURE = 'repeated_failure';
    public const TRIGGER_STATUTORY_CHANGE = 'statutory_change';

    protected $fillable = [
        'equipment_id', 'consequence_c', 'exposure_e', 'redundancy_r',
        'criticality_index', 'band', 'high_threshold_applied', 'medium_threshold_applied',
        'status', 'assessed_by', 'assessed_at', 'approved_by', 'approved_at',
        'review_trigger', 'justification', 'decision_remarks',
    ];

    protected function casts(): array
    {
        return [
            'band' => CriticalityBand::class,
            'status' => AssessmentStatus::class,
            'assessed_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function assessor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assessed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', AssessmentStatus::Pending);
    }
}
