<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The department's parts catalogue: what a thing is, not how many anyone has.
 *
 * Operators read this and cannot add to it. Quantities live in part_stocks,
 * one row per operator, because spares are on the contractor's account.
 */
class Part extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'code', 'name', 'part_category_id', 'oem_reference', 'uom',
        'unit_cost', 'lead_time_days', 'image_path', 'remarks', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'unit_cost' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PartCategory::class, 'part_category_id');
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(PartStock::class);
    }

    /** This part's holding for one operator, or null if they hold none. */
    public function stockFor(Operator|int $operator): ?PartStock
    {
        return $this->stocks()
            ->where('operator_id', $operator instanceof Operator ? $operator->id : $operator)
            ->first();
    }

    /** Total across every operator. The department's view. */
    public function totalStock(): float
    {
        return (float) $this->stocks()->sum('stock_qty');
    }
}
