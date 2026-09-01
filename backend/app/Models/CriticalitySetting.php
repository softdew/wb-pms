<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Band thresholds, one row per organisation. Defaults follow the maintenance
 * logic issued by the client: High >= 30, Medium 12-29, Low <= 11.
 */
class CriticalitySetting extends Model
{
    use BelongsToOrganisation, HasFactory;

    public const BAND_HIGH = 'high';
    public const BAND_MEDIUM = 'medium';
    public const BAND_LOW = 'low';

    protected $fillable = ['high_threshold', 'medium_threshold'];

    protected function casts(): array
    {
        return [
            'high_threshold' => 'integer',
            'medium_threshold' => 'integer',
        ];
    }

    /** C x E x R, banded. The index itself is never entered by hand. */
    public function bandFor(int $index): string
    {
        return match (true) {
            $index >= $this->high_threshold => self::BAND_HIGH,
            $index >= $this->medium_threshold => self::BAND_MEDIUM,
            default => self::BAND_LOW,
        };
    }
}
