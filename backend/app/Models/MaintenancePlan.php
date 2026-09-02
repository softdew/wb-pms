<?php

namespace App\Models;

use App\Enums\DueStatus;
use App\Enums\IntervalUnit;
use App\Enums\TriggerClass;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use App\Models\Concerns\ScopedToOperator;

class MaintenancePlan extends Model implements AuditableContract
{
    use Auditable, BelongsToOrganisation, HasFactory, ScopedToOperator, SoftDeletes;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';

    protected $fillable = [
        'equipment_id', 'checklist_task_id', 'trigger_class',
        'oem_interval_value', 'statutory_interval_value', 'history_interval_value',
        'applicable_interval_value', 'applicable_interval_unit', 'interval_reason',
        'first_interval_value', 'statutory_outer_limit',
        'condition_parameter', 'condition_limit',
        'release_lead_days', 'warning_window',
        'last_done_on', 'last_done_meter_reading',
        'status', 'remarks',
    ];

	public function operatorRelationPath(): string
    {
        return 'equipment.vessel';
    }
	
    /**
     * next_due_* and due_status are absent from $fillable on purpose. They are
     * derived values, written only by DueDateService.
     */
    protected function casts(): array
    {
        return [
            'trigger_class' => TriggerClass::class,
            'applicable_interval_unit' => IntervalUnit::class,
            'due_status' => DueStatus::class,
            'oem_interval_value' => 'decimal:2',
            'statutory_interval_value' => 'decimal:2',
            'history_interval_value' => 'decimal:2',
            'applicable_interval_value' => 'decimal:2',
            'first_interval_value' => 'decimal:2',
            'statutory_outer_limit' => 'decimal:2',
            'condition_limit' => 'decimal:4',
            'last_done_meter_reading' => 'decimal:2',
            'next_due_meter_reading' => 'decimal:2',
            'last_done_on' => 'date',
            'next_due_on' => 'date',
            'due_status_computed_at' => 'datetime',
        ];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ChecklistTask::class, 'checklist_task_id');
    }

    // -- state ---------------------------------------------------------------

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /** Has this task ever been completed on this asset? */
    public function hasBeenDone(): bool
    {
        return $this->last_done_on !== null || $this->last_done_meter_reading !== null;
    }

    /**
     * The interval that applies right now: the first-service value while the
     * task has never been done, the recurring value thereafter.
     */
    public function effectiveIntervalValue(): ?float
    {
        if (! $this->hasBeenDone() && $this->first_interval_value !== null) {
            return (float) $this->first_interval_value;
        }

        return $this->applicable_interval_value !== null
            ? (float) $this->applicable_interval_value
            : null;
    }

    public function isMeterBased(): bool
    {
        return $this->trigger_class === TriggerClass::Meter
            && $this->applicable_interval_unit?->isMeterBased() === true;
    }

    public function intervalLabel(): ?string
    {
        $value = $this->effectiveIntervalValue();

        return $value !== null && $this->applicable_interval_unit
            ? $this->applicable_interval_unit->label($value)
            : null;
    }

    // -- scopes --------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeDue(Builder $query): Builder
    {
        return $query->where('due_status', DueStatus::Due);
    }

    public function scopeDueSoon(Builder $query): Builder
    {
        return $query->where('due_status', DueStatus::DueSoon);
    }

    /** Automatic classes only -- condition and event lines are user-raised. */
    public function scopeAutomatic(Builder $query): Builder
    {
        return $query->whereIn('trigger_class', [
            TriggerClass::Calendar->value,
            TriggerClass::Meter->value,
            TriggerClass::Statutory->value,
        ]);
    }
}
