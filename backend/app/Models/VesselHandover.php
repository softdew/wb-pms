<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VesselHandover extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'vessel_id', 'from_operator_id', 'to_operator_id',
        'handed_over_on', 'tender_reference',
        'meter_readings', 'open_work_orders', 'overdue_tasks', 'outstanding',
        'condition_notes', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'handed_over_on' => 'date',
            'meter_readings' => 'array',
            'outstanding' => 'array',
        ];
    }

    public function vessel(): BelongsTo
    {
        return $this->belongsTo(Vessel::class);
    }

    public function fromOperator(): BelongsTo
    {
        return $this->belongsTo(Operator::class, 'from_operator_id');
    }

    public function toOperator(): BelongsTo
    {
        return $this->belongsTo(Operator::class, 'to_operator_id');
    }
}
