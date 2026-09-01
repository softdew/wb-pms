<?php

namespace App\Models;

use App\Enums\BacklogState;
use App\Enums\ExecutingEntity;
use App\Enums\WorkOrderStatus;
use App\Enums\WorkOrderType;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;

class WorkOrder extends Model implements AuditableContract
{
    use Auditable, BelongsToOrganisation, HasFactory, SoftDeletes;

    protected $fillable = [
        'equipment_id', 'maintenance_plan_id', 'checklist_task_id',
        'type', 'description', 'priority', 'executing_entity',
        'assigned_to', 'vendor_id', 'permit_reference',
        'due_on', 'due_meter_reading', 'estimated_hours', 'estimated_cost',
        'remarks',
    ];

    /**
     * number, status, backlog_state and the completion fields are absent from
     * $fillable. They are written only by WorkOrderService, which enforces the
     * status transitions and the mandatory close-out.
     */
    protected function casts(): array
    {
        return [
            'type' => WorkOrderType::class,
            'status' => WorkOrderStatus::class,
            'backlog_state' => BacklogState::class,
            'executing_entity' => ExecutingEntity::class,
            'task_snapshot' => 'array',
            'due_on' => 'date',
            'released_on' => 'date',
            'started_on' => 'date',
            'completed_on' => 'date',
            'closed_at' => 'datetime',
            'due_meter_reading' => 'decimal:2',
            'meter_at_completion' => 'decimal:2',
            'estimated_hours' => 'decimal:2',
            'estimated_cost' => 'decimal:2',
            'actual_cost' => 'decimal:2',
        ];
    }

    // -- relations ----------------------------------------------------------

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MaintenancePlan::class, 'maintenance_plan_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ChecklistTask::class, 'checklist_task_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function readings(): HasMany
    {
        return $this->hasMany(WorkOrderReading::class)->orderBy('sort_order')->orderBy('id');
    }

    public function parts(): HasMany
    {
        return $this->hasMany(WorkOrderPart::class);
    }

    public function labour(): HasMany
    {
        return $this->hasMany(WorkOrderLabour::class);
    }

    public function closeout(): HasOne
    {
        return $this->hasOne(WorkOrderCloseout::class);
    }

    public function stockTransactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class);
    }

    // -- state ---------------------------------------------------------------

    public function isOpen(): bool
    {
        return $this->status->isOpen();
    }

    /** Mandatory readings still without a captured value. */
    public function missingMandatoryReadings(): int
    {
        return $this->readings()->where('is_mandatory', true)->whereNull('value')->count();
    }

    public function actualLabourHours(): float
    {
        return (float) $this->labour()->sum('actual_hours');
    }

    public function standardLabourHours(): float
    {
        return (float) $this->labour()->sum('standard_hours');
    }

    /** Every planned part covered by stock on hand. */
    public function partsAvailable(): bool
    {
        return $this->parts->every(fn (WorkOrderPart $line) => $line->isAvailable());
    }

    // -- scopes --------------------------------------------------------------

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereIn('status', [
            WorkOrderStatus::Draft->value,
            WorkOrderStatus::Released->value,
            WorkOrderStatus::InProgress->value,
        ]);
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->open()->whereDate('due_on', '<', now()->toDateString());
    }

    public function scopeInBacklogState(Builder $query, BacklogState $state): Builder
    {
        return $query->open()->where('backlog_state', $state);
    }
}
