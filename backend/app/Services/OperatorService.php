<?php

namespace App\Services;

use App\Enums\OperatorType;
use App\Exceptions\MaintenanceRuleException;
use App\Models\Operator;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

/**
 * Creating an operating company and its login in one act.
 *
 * A society with no login cannot record anything, so splitting the two into
 * separate screens only creates a half-set-up operator nobody notices. The
 * login is a company account rather than a person's -- one per operating
 * company, as agreed -- so a sign-off identifies the contractor.
 */
class OperatorService
{
    /**
     * @param  array{
     *   code:string, name:string, type:string,
     *   agreement_no?:?string, tender_reference?:?string,
     *   agreement_from?:?string, agreement_to?:?string,
     *   contact_name?:?string, contact_designation?:?string,
     *   contact_phone?:?string, contact_email?:?string,
     *   address?:?string, remarks?:?string,
     * }  $attributes
     * @param  array{email:string, password?:?string, name?:?string}|null  $login
     * @return array{operator:Operator, user:?User, password:?string}
     */
    public function create(array $attributes, ?array $login = null): array
    {
        return DB::transaction(function () use ($attributes, $login) {
            $operator = Operator::create($attributes);

            if (! $login) {
                return ['operator' => $operator, 'user' => null, 'password' => null];
            }

            // Generated when not supplied, so the admin has something to hand
            // over rather than inventing one that ends up on a sticky note.
            $password = $login['password'] ?: Str::password(12, symbols: false);

            $user = $this->issueLogin($operator, $login['email'], $password, $login['name'] ?? null);

            return ['operator' => $operator, 'user' => $user, 'password' => $password];
        });
    }

    /** Issue the shared login for an operating company. */
    public function issueLogin(Operator $operator, string $email, string $password, ?string $name = null): User
    {
        if (User::where('email', $email)->exists()) {
            throw new MaintenanceRuleException(
                'That email address already has an account. Use a different one, or reset the existing login.'
            );
        }

        $user = User::create([
            'organisation_id' => $operator->organisation_id,
            'operator_id' => $operator->id,
            'name' => $name ?: $operator->name,
            'email' => $email,
            'password' => $password,
        ]);

        app(PermissionRegistrar::class)->setPermissionsTeamId($operator->organisation_id);
        $user->assignRole(Roles::OPERATOR);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user->refresh();
    }

    /**
     * Suspending an operator withdraws its access without deleting anything:
     * the vessels it held, the work it recorded and the stock it holds all stay
     * where they are.
     */
    public function suspend(Operator $operator): Operator
    {
        if ($operator->type === OperatorType::Department) {
            throw new MaintenanceRuleException(
                'The department\'s own operation cannot be suspended.'
            );
        }

        $operator->update(['status' => Operator::STATUS_ENDED]);

        return $operator->refresh();
    }

    public function reinstate(Operator $operator): Operator
    {
        $operator->update(['status' => Operator::STATUS_ACTIVE]);

        return $operator->refresh();
    }

    public function resetPassword(User $user, ?string $password = null): string
    {
        $password = $password ?: Str::password(12, symbols: false);

        $user->forceFill(['password' => $password])->save();

        return $password;
    }
}
