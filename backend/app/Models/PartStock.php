<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * What one operator holds of one catalogue part.
 *
 * Not scoped by OperatorScope: stock has an operator_id of its own, and the
 * StockService always names the operator explicitly. The department reads
 * across all operators, which is what "department can see anything" means.
 */
class PartStock extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'operator_id', 'part_id', 'stock_qty', 'reorder_level', 'location_id', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'stock_qty' => 'decimal:3',
            'reorder_level' => 'decimal:3',
        ];
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(Operator::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function isBelowReorderLevel(): bool
    {
        return $this->reorder_level !== null
            && (float) $this->stock_qty <= (float) $this->reorder_level;
    }

    public function scopeForOperator(Builder $query, Operator|int $operator): Builder
    {
        return $query->where('operator_id', $operator instanceof Operator ? $operator->id : $operator);
    }

    public function scopeBelowReorderLevel(Builder $query): Builder
    {
        return $query->whereNotNull('reorder_level')->whereColumn('stock_qty', '<=', 'reorder_level');
    }
}
