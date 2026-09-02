<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * Deliberately NOT using BelongsToOrganisation. User and Organisation are how
 * the tenant context gets established, so scoping them would be circular.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = [
        'organisation_id', 'name', 'employee_code', 'trade_id',
        'email', 'password', 'status', 'operator_id'
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_platform_admin' => 'boolean',
        ];
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function trade(): BelongsTo
    {
        return $this->belongsTo(Trade::class);
    }
	
	public function operator(): BelongsTo
	{
		return $this->belongsTo(Operator::class);
	}

	/** True for the operating company's shared login. */
	public function isOperator(): bool
	{
		return $this->operator_id !== null;
	}

}