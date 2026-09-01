<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * The four close-out code sets. All four are mandatory at work-order close-out;
 * free text is stored alongside them, never in place of them.
 */
class FailureCode extends Model
{
    use BelongsToOrganisation, HasFactory;

    public const TYPE_FAILURE_MODE = 'failure_mode';
    public const TYPE_CAUSE = 'cause';
    public const TYPE_DETECTION_METHOD = 'detection_method';
    public const TYPE_SEVERITY = 'severity';

    public const TYPES = [
        self::TYPE_FAILURE_MODE,
        self::TYPE_CAUSE,
        self::TYPE_DETECTION_METHOD,
        self::TYPE_SEVERITY,
    ];

    protected $fillable = ['type', 'code', 'description', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type)->where('is_active', true)->orderBy('sort_order');
    }
}
