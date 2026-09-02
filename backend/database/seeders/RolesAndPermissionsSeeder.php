<?php

namespace Database\Seeders;

use App\Models\Organisation;
use App\Support\Permissions;
use App\Support\Roles;
use App\Support\Tenancy;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Permissions are created once and shared. Roles are per organisation, so one
 * tenant's roles cannot be edited into another's.
 *
 *   php artisan db:seed --class=RolesAndPermissionsSeeder
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(?Organisation $organisation = null): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        // Permissions are global: no team.
        $registrar->setPermissionsTeamId(null);

        foreach (Permissions::all() as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $seedFor = function (Organisation $org) use ($registrar) {
            $registrar->setPermissionsTeamId($org->id);

            // The team key is written explicitly rather than left to the
            // registrar. findOrCreate() resolves the team from global state,
            // which is easy to get wrong in a seeder and silently produces
            // roles with no team -- shared across every tenant.
            $teamKey = config('permission.column_names.team_foreign_key', 'team_id');

            foreach (Permissions::roles() as $roleName => $permissions) {
                $role = Role::firstOrCreate([
                    'name' => $roleName,
                    'guard_name' => 'web',
                    $teamKey => $org->id,
                ]);

                $role->syncPermissions($permissions);
            }

            $this->command?->info('Roles seeded for '.$org->code.'.');
        };

        if ($organisation) {
            $seedFor($organisation);
        } else {
            app(Tenancy::class)->unscoped(fn () => Organisation::query()->each($seedFor));
        }

        $registrar->forgetCachedPermissions();
    }
}
