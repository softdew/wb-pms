<?php

namespace App\Models;

use App\Enums\MeterType;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Reading history. Hour-based due dates are computed from this and from the
 * reading taken at the last completion -- never from a single running total,
 * which cannot answer "how many hours since the last overhaul".
 */
class EquipmentMeterReading extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'equipment_id', 'meter_type', 'reading_value', 'reading_on',
        'is_reset', 'previous_value', 'recorded_by', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'meter_type' => MeterType::class,
            'reading_value' => 'decimal:2',
            'previous_value' => 'decimal:2',
            'reading_on' => 'date',
            'is_reset' => 'boolean',
        ];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
