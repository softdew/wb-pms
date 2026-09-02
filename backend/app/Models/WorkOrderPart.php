<?php

namespace App\Models;

use App\Enums\PartLineType;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderPart extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'work_order_id', 'part_id', 'planned_quantity', 'actual_quantity', 'line_type',
    ];

    protected function casts(): array
    {
        return [
            'planned_quantity' => 'decimal:3',
            'actual_quantity' => 'decimal:3',
            'line_type' => PartLineType::class,
        ];
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    /** Availability is measured against the stock of the operator running the vessel. */
    public function isAvailable(): bool
    {
        $operatorId = $this->workOrder?->equipment?->vessel?->operator_id;

        if (! $operatorId) {
            return false; // no operator assigned means no stock to draw from
        }

        $held = \App\Models\PartStock::query()
            ->where('part_id', $this->part_id)
            ->where('operator_id', $operatorId)
            ->value('stock_qty');

        return (float) ($held ?? 0) >= (float) $this->planned_quantity;
    }
}
