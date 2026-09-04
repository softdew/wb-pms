<?php

namespace App\Models;

use App\Enums\StockTransactionType;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Operator;

class StockTransaction extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'part_id', 'work_order_id', 'location_id', 'type',
        'quantity', 'balance_after', 'unit_cost',
        'reference_no', 'transacted_on', 'recorded_by', 'remarks', 'operator_id'
    ];

    protected function casts(): array
    {
        return [
            'type' => StockTransactionType::class,
            'quantity' => 'decimal:3',
            'balance_after' => 'decimal:3',
            'unit_cost' => 'decimal:2',
            'transacted_on' => 'date',
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
	
	public function operator(): BelongsTo
    {
        return $this->belongsTo(Operator::class);
    }
	
	public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
