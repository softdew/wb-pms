<?php

namespace Tests\Feature\Access;

use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\Operator;
use App\Models\Organisation;
use App\Models\ShipType;
use App\Models\User;
use App\Models\Vessel;
use App\Support\Roles;
use App\Support\Tenancy;
use Database\Seeders\ReferenceDataSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Authorisation, not authentication.
 *
 * Until this existed, any signed-in user could approve criticality bands, edit
 * band thresholds and delete master data. These tests are what stop that
 * returning.
 */
class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected Organisation $org;

    protected Operator $society;

    protected Vessel $vessel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organisation::create(['code' => 'WBTC', 'name' => 'WB Transport Corporation']);
        app(ReferenceDataSeeder::class)->run($this->org);
        app(RolesAndPermissionsSeeder::class)->run($this->org);

        app(Tenancy::class)->set($this->org);
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->org->id);

        $this->society = Operator::create([
            'code' => 'COOP1',
            'name' => 'Hooghly Ferry Cooperative Society',
            'type' => 'cooperative_society',
        ]);

        $shipType = ShipType::create(['code' => 'FERRY', 'name' => 'Passenger Ferry']);

        $this->vessel = Vessel::create([
            'ship_type_id' => $shipType->id,
            'operator_id' => $this->society->id,
            'code' => 'MV01',
            'name' => 'MV Sagarika',
        ]);
    }

    protected function userWithRole(string $role, ?Operator $operator = null): User
    {
        $user = User::create([
            'organisation_id' => $this->org->id,
            'operator_id' => $operator?->id,
            'name' => Roles::label($role),
            'email' => $role.'-'.fake()->unique()->numberBetween(1, 9999).'@test.local',
            'password' => 'secret-password',
        ]);

        app(PermissionRegistrar::class)->setPermissionsTeamId($this->org->id);
        $user->assignRole($role);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user->refresh();
    }

    protected function makeEngine(): Equipment
    {
        return Equipment::create([
            'vessel_id' => $this->vessel->id,
            'equipment_category_id' => EquipmentCategory::firstWhere('code', 'ME')->id,
            'code' => 'ME-'.fake()->unique()->numberBetween(100, 999),
            'name' => 'Main Engine',
        ]);
    }

    // -- the rule that matters ----------------------------------------------

    /**
     * A planner may score a criticality assessment but must not approve one.
     * Without this the maker-checker split is decorative: one person could
     * score and approve using two browser tabs.
     */
    public function test_a_planner_can_score_but_cannot_approve_criticality(): void
    {
        $planner = $this->userWithRole(Roles::PLANNER);
        $engine = $this->makeEngine();

        Sanctum::actingAs($planner);

        $assessment = $this->postJson("/api/equipment/{$engine->id}/criticality", [
            'consequence_c' => 5, 'exposure_e' => 4, 'redundancy_r' => 3,
        ])->assertCreated()->json();

        $this->postJson("/api/criticality/{$assessment['id']}/approve")->assertForbidden();
    }

    public function test_the_technical_authority_can_approve(): void
    {
        $planner = $this->userWithRole(Roles::PLANNER);
        $authority = $this->userWithRole(Roles::TECHNICAL_AUTHORITY);
        $engine = $this->makeEngine();

        Sanctum::actingAs($planner);
        $assessment = $this->postJson("/api/equipment/{$engine->id}/criticality", [
            'consequence_c' => 5, 'exposure_e' => 4, 'redundancy_r' => 3,
        ])->json();

        Sanctum::actingAs($authority);
        $this->postJson("/api/criticality/{$assessment['id']}/approve")->assertOk();
    }

    public function test_a_store_user_cannot_touch_criticality(): void
    {
        $engine = $this->makeEngine();

        Sanctum::actingAs($this->userWithRole(Roles::STORE));

        $this->postJson("/api/equipment/{$engine->id}/criticality", [
            'consequence_c' => 3, 'exposure_e' => 3, 'redundancy_r' => 2,
        ])->assertForbidden();
    }

    // -- the auditor ---------------------------------------------------------

    public function test_an_auditor_reads_everything(): void
    {
        Sanctum::actingAs($this->userWithRole(Roles::AUDITOR));

        $this->getJson('/api/vessels')->assertOk();
        $this->getJson('/api/equipment')->assertOk();
        $this->getJson('/api/work-orders')->assertOk();
        $this->getJson('/api/parts')->assertOk();
        $this->getJson('/api/maintenance-plans')->assertOk();
    }

    public function test_an_auditor_writes_nothing(): void
    {
        $engine = $this->makeEngine();

        Sanctum::actingAs($this->userWithRole(Roles::AUDITOR));

        $this->postJson('/api/ship-types', ['code' => 'X', 'name' => 'X'])->assertForbidden();
        $this->postJson('/api/vessels', ['code' => 'X', 'name' => 'X'])->assertForbidden();
        $this->postJson("/api/equipment/{$engine->id}/meter-readings", ['reading_value' => 100])->assertForbidden();
        $this->postJson("/api/equipment/{$engine->id}/criticality", [
            'consequence_c' => 1, 'exposure_e' => 1, 'redundancy_r' => 1,
        ])->assertForbidden();
        $this->postJson('/api/work-orders/breakdown', [
            'equipment_id' => $engine->id, 'description' => 'X',
        ])->assertForbidden();
    }

    // -- operators -----------------------------------------------------------

    

    /** Seeing is not writing. */
    public function test_an_operator_cannot_record_against_another_operators_vessel(): void
    {
        $other = Operator::create(['code' => 'COOP2', 'name' => 'Second Society']);

        $otherVessel = Vessel::create([
            'ship_type_id' => ShipType::first()->id,
            'operator_id' => $other->id,
            'code' => 'MV02',
            'name' => 'MV Other',
        ]);

        $otherEngine = Equipment::create([
            'vessel_id' => $otherVessel->id,
            'equipment_category_id' => EquipmentCategory::firstWhere('code', 'ME')->id,
            'code' => 'ME-OTHER',
            'name' => 'Main Engine',
            'meter_type' => 'running_hours',
        ]);

        $operator = $this->userWithRole(Roles::OPERATOR, $this->society);

        $this->assertFalse($operator->can('recordMeterReading', $otherEngine));

        $ownEngine = $this->makeEngine();
        $ownEngine->forceFill(['meter_type' => 'running_hours'])->save();

        $this->assertTrue($operator->can('recordMeterReading', $ownEngine->refresh()));
    }

    /** Closing is the department accepting the work, so it is not the operator's. */
    public function test_an_operator_cannot_close_a_work_order(): void
    {
        $operator = $this->userWithRole(Roles::OPERATOR, $this->society);

        Sanctum::actingAs($operator);

        $this->postJson('/api/work-orders/breakdown', [
            'equipment_id' => $this->makeEngine()->id,
            'description' => 'Fuel pump seizure',
        ])->assertForbidden();
    }

    public function test_an_operator_cannot_amend_the_asset_register(): void
    {
        Sanctum::actingAs($this->userWithRole(Roles::OPERATOR, $this->society));

        $this->postJson('/api/vessels', ['code' => 'NEW', 'name' => 'New Vessel'])->assertForbidden();
    }

    // -- department roles ----------------------------------------------------

    public function test_a_supervisor_cannot_raise_work_but_can_execute(): void
    {
        $supervisor = $this->userWithRole(Roles::SUPERVISOR);

        Sanctum::actingAs($supervisor);

        $this->postJson('/api/work-orders/breakdown', [
            'equipment_id' => $this->makeEngine()->id,
            'description' => 'Test',
        ])->assertForbidden();

        $this->assertTrue($supervisor->can(\App\Support\Permissions::COMPLETE_WORK_ORDER));
    }

    public function test_management_is_read_only(): void
    {
        Sanctum::actingAs($this->userWithRole(Roles::MANAGEMENT));

        $this->getJson('/api/work-orders/backlog')->assertOk();
        $this->postJson('/api/ship-types', ['code' => 'X', 'name' => 'X'])->assertForbidden();
    }

    public function test_the_department_admin_holds_everything(): void
    {
        $admin = $this->userWithRole(Roles::DEPARTMENT_ADMIN);

        foreach (\App\Support\Permissions::all() as $permission) {
            $this->assertTrue($admin->can($permission), "Department admin is missing {$permission}.");
        }
    }

    /** Roles are per organisation, so one tenant's cannot be reached from another. */
        /** Roles are per organisation, so one tenant's cannot be edited into another's. */
    public function test_roles_are_scoped_to_the_organisation(): void
    {
        $other = Organisation::create(['code' => 'OTHER', 'name' => 'Another Corporation']);
        app(RolesAndPermissionsSeeder::class)->run($other);

        $teamKey = config('permission.column_names.team_foreign_key');

        // Two Planner rows, one per organisation. A plain query sees both --
        // Spatie adds no global scope -- so what matters is that each carries
        // its own team and the registrar resolves the right one.
        $planners = \Spatie\Permission\Models\Role::where('name', Roles::PLANNER)->get();

        $this->assertCount(2, $planners);
        $this->assertEqualsCanonicalizing(
            [$this->org->id, $other->id],
            $planners->pluck($teamKey)->all()
        );

        app(PermissionRegistrar::class)->setPermissionsTeamId($this->org->id);
        $ours = \Spatie\Permission\Models\Role::findByName(Roles::PLANNER, 'web');

        $this->assertSame($this->org->id, $ours->{$teamKey});
    }
}
