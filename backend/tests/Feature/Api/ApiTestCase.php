<?php

namespace Tests\Feature\Api;

use App\Models\EquipmentCategory;
use App\Models\Organisation;
use App\Models\User;
use App\Support\Roles;
use App\Support\Tenancy;
use Database\Seeders\ReferenceDataSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected Organisation $alpha;

    protected Organisation $beta;

    protected User $alphaUser;

    protected User $betaUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->alpha = $this->makeOrganisation('ALPHA', 'Alpha Ferries');
        $this->beta = $this->makeOrganisation('BETA', 'Beta Boats');

        // These tests are about tenant isolation, not about permissions, so the
        // users hold the department administrator role. What a planner may not
        // do is covered in RolePermissionTest.
        $this->alphaUser = $this->makeUser($this->alpha, 'alpha@test.local');
        $this->betaUser = $this->makeUser($this->beta, 'beta@test.local');
    }

    protected function makeOrganisation(string $code, string $name): Organisation
    {
        $organisation = Organisation::create(['code' => $code, 'name' => $name]);

        app(ReferenceDataSeeder::class)->run($organisation);
        app(RolesAndPermissionsSeeder::class)->run($organisation);

        return $organisation;
    }

    protected function makeUser(Organisation $organisation, string $email, array $attributes = []): User
    {
        $user = User::create(array_merge([
            'organisation_id' => $organisation->id,
            'name' => 'Test User',
            'email' => $email,
            'password' => 'secret-password',
        ], $attributes));

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($organisation->id);
        $user->assignRole($attributes['role'] ?? Roles::DEPARTMENT_ADMIN);
        $registrar->forgetCachedPermissions();

        return $user->refresh();
    }

    protected function within(Organisation $organisation, callable $callback): mixed
    {
        return app(Tenancy::class)->runFor($organisation, $callback);
    }

    protected function actingAsApi(User $user): static
    {
        Sanctum::actingAs($user);

        if ($user->organisation_id) {
            app(PermissionRegistrar::class)->setPermissionsTeamId($user->organisation_id);
        }

        return $this;
    }

    protected function categoryFor(Organisation $organisation): EquipmentCategory
    {
        return $this->within($organisation, fn () => EquipmentCategory::firstWhere('code', 'ME'));
    }
}
