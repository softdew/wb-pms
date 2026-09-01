<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Part extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'code', 'name', 'part_category_id', 'oem_reference', 'uom',
        'unit_cost', 'stock_qty', 'reorder_level', 'lead_time_days',
        'location_id', 'image_path', 'remarks', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'unit_cost' => 'decimal:2',
            'stock_qty' => 'decimal:3',
            'reorder_level' => 'decimal:3',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PartCategory::class, 'part_category_id');
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
}
