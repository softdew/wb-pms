<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceRate extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'activity', 'unit', 'rate', 'vendor_id',
        'valid_from', 'valid_to', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:2',
            'valid_from' => 'date',
            'valid_to' => 'date',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /** Rates in force on a given date. */
    public function scopeEffectiveOn(Builder $query, $date): Builder
    {
        return $query->whereDate('valid_from', '<=', $date)
            ->where(fn (Builder $q) => $q
                ->whereNull('valid_to')
                ->orWhereDate('valid_to', '>=', $date));
    }
}
