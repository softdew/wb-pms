<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * The tenant. Deliberately NOT scoped by OrganisationScope -- this is the one
 * table that must be queryable without a tenant context.
 */
class Organisation extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';

    public const TYPE_OPERATOR = 'operator';
    public const TYPE_DEPARTMENT = 'department';

    protected $fillable = [
        'code', 'name', 'type', 'status',
        'contact_name', 'contact_email', 'contact_phone',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
