<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderReading extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'work_order_id', 'parameter', 'unit', 'minimum', 'maximum',
        'is_mandatory', 'sort_order', 'value', 'is_within_limits', 'observation',
    ];

    protected function casts(): array
    {
        return [
            'minimum' => 'decimal:4',
            'maximum' => 'decimal:4',
            'value' => 'decimal:4',
            'is_mandatory' => 'boolean',
            'is_within_limits' => 'boolean',
        ];
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    /** Record a value and judge it against the limits carried on the line. */
    public function capture(float $value, ?string $observation = null): self
    {
        $within = true;

        if ($this->minimum !== null && $value < (float) $this->minimum) {
            $within = false;
        }

        if ($this->maximum !== null && $value > (float) $this->maximum) {
            $within = false;
        }

        $this->update([
            'value' => $value,
            'is_within_limits' => $within,
            'observation' => $observation,
        ]);

        return $this;
    }
}
