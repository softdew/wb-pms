<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CriticalityScalePoint extends Model
{
    use BelongsToOrganisation, HasFactory;

    public const FACTOR_CONSEQUENCE = 'C';
    public const FACTOR_EXPOSURE = 'E';
    public const FACTOR_REDUNDANCY = 'R';

    /** Permitted value range for each factor. */
    public const RANGES = [
        self::FACTOR_CONSEQUENCE => [1, 5],
        self::FACTOR_EXPOSURE => [1, 5],
        self::FACTOR_REDUNDANCY => [1, 3],
    ];

    protected $fillable = ['factor', 'value', 'label', 'anchor'];

    protected function casts(): array
    {
        return ['value' => 'integer'];
    }
}
