<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderCloseout extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'work_order_id',
        'failure_mode_code_id', 'cause_code_id', 'detection_method_code_id', 'severity_code_id',
        'planned_downtime_hours', 'unplanned_downtime_hours',
        'acceptance_criteria_met', 'signed_off_by', 'completed_on',
        'meter_at_completion', 'observations',
    ];

    protected function casts(): array
    {
        return [
            'planned_downtime_hours' => 'decimal:2',
            'unplanned_downtime_hours' => 'decimal:2',
            'meter_at_completion' => 'decimal:2',
            'acceptance_criteria_met' => 'boolean',
            'completed_on' => 'date',
        ];
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function failureMode(): BelongsTo
    {
        return $this->belongsTo(FailureCode::class, 'failure_mode_code_id');
    }

    public function cause(): BelongsTo
    {
        return $this->belongsTo(FailureCode::class, 'cause_code_id');
    }

    public function detectionMethod(): BelongsTo
    {
        return $this->belongsTo(FailureCode::class, 'detection_method_code_id');
    }

    public function severity(): BelongsTo
    {
        return $this->belongsTo(FailureCode::class, 'severity_code_id');
    }

    public function totalDowntimeHours(): float
    {
        return (float) $this->planned_downtime_hours + (float) $this->unplanned_downtime_hours;
    }
}
