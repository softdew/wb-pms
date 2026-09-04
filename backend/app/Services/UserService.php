<?php

namespace App\Services;

use App\Exceptions\MaintenanceRuleException;
use App\Models\User;
use App\Support\Roles;
use App\Support\Tenancy;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

/**
 * Department accounts.
 *
 * Operator logins are issued from the operator record, because they belong to a
 * company rather than a person. This handles the department's own staff:
 * planners, supervisors, store, the technical authority, auditors.
 */
class UserService
{
    /**
     * @param  array{name:string, email:string, employee_code?:?string, trade_id?:?int}  $attributes
     * @return array{user:User, password:string}
     */
    public function create(array $attributes, string $role, ?string $password = null): array
    {
        if (in_array($role, Roles::EXTERNAL, true)) {
            throw new MaintenanceRuleException(
                'An operator login is issued from the operator record, not here, so that the account belongs to the company.'
            );
        }

        $password = $password ?: Str::password(12, symbols: false);

        $user = User::create($attributes + [
            'organisation_id' => app(Tenancy::class)->id(),
            'password' => $password,
        ]);

        $this->assignRole($user, $role);

        return ['user' => $user->refresh(), 'password' => $password];
    }

    /**
     * Exactly one role per account.
     *
     * The separation the maintenance logic relies on -- scoring and approving
     * criticality held apart -- is only real if one person cannot hold both.
     */
    public function assignRole(User $user, string $role): User
    {
        if (! in_array($role, Roles::all(), true)) {
            throw new MaintenanceRuleException('Unknown role "'.$role.'".');
        }

        if ($user->operator_id && $role !== Roles::OPERATOR) {
            throw new MaintenanceRuleException(
                'An operator account can only hold the operator role.'
            );
        }

        app(PermissionRegistrar::class)->setPermissionsTeamId($user->organisation_id);
        $user->syncRoles([$role]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user->refresh();
    }

    public function resetPassword(User $user, ?string $password = null): string
    {
        $password = $password ?: Str::password(12, symbols: false);

        $user->forceFill(['password' => $password])->save();

        return $password;
    }

    /**
     * Suspending withdraws access without deleting the account, so the work
     * signed off in that person's name keeps its author.
     */
    public function setStatus(User $user, string $status, ?User $actor = null): User
    {
        if ($actor && $actor->id === $user->id) {
            throw new MaintenanceRuleException('You cannot suspend your own account.');
        }

        if ($status === 'suspended' && $this->isLastAdministrator($user)) {
            throw new MaintenanceRuleException(
                'This is the only active administrator. Give someone else the role first, or nobody can manage the system.'
            );
        }

        $user->forceFill(['status' => $status])->save();

        return $user->refresh();
    }

    protected function isLastAdministrator(User $user): bool
    {
        if (! $user->hasRole(Roles::DEPARTMENT_ADMIN)) {
            return false;
        }

        return User::query()
            ->where('organisation_id', $user->organisation_id)
            ->where('status', 'active')
            ->whereKeyNot($user->id)
            ->get()
            ->filter(fn (User $other) => $other->hasRole(Roles::DEPARTMENT_ADMIN))
            ->isEmpty();
    }
}
