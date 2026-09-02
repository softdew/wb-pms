<?php

namespace Tests\Feature\Access;

use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\Operator;
use App\Models\Organisation;
use App\Models\ShipType;
use App\Models\User;
use App\Models\Vessel;
use App\Models\WorkOrder;
use App\Support\OperatorContext;
use App\Support\Roles;
use App\Support\Tenancy;
use Database\Seeders\ReferenceDataSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Isolation between operating companies.
 *
 * These are competitors bidding for the same tenders, so one society seeing
 * another's vessels, hours or costs is a commercial problem, not a cosmetic
 * one. The department sits above all of them and sees everything.
 */
class OperatorIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected Organisation $org;

    protected Operator $coopA;

    protected Operator $coopB;

    protected Vessel $vesselA;

    protected Vessel $vesselB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organisation::create(['code' => 'WBTC', 'name' => 'WB Transport Corporation']);
        app(ReferenceDataSeeder::class)->run($this->org);
        app(RolesAndPermissionsSeeder::class)->run($this->org);

        app(Tenancy::class)->set($this->org);
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->org->id);

        $this->coopA = Operator::create(['code' => 'COOPA', 'name' => 'Hooghly Society', 'type' => 'cooperative_society']);
        $this->coopB = Operator::create(['code' => 'COOPB', 'name' => 'Ganga Society', 'type' => 'cooperative_society']);

        $type = ShipType::create(['code' => 'FERRY', 'name' => 'Passenger Ferry']);

        $this->vesselA = Vessel::create(['ship_type_id' => $type->id, 'operator_id' => $this->coopA->id, 'code' => 'MV-A', 'name' => 'MV Sagarika']);
        $this->vesselB = Vessel::create(['ship_type_id' => $type->id, 'operator_id' => $this->coopB->id, 'code' => 'MV-B', 'name' => 'MV Bhagirathi']);
    }

    protected function makeUser(string $role, ?Operator $operator = null): User
    {
        $user = User::create([
            'organisation_id' => $this->org->id,
            'operator_id' => $operator?->id,
            'name' => Roles::label($role),
            'email' => $role.fake()->unique()->numberBetween(1, 9999).'@test.local',
            'password' => 'secret-password',
        ]);

        app(PermissionRegistrar::class)->setPermissionsTeamId($this->org->id);
        $user->assignRole($role);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user->refresh();
    }

    protected function engineOn(Vessel $vessel): Equipment
    {
        return Equipment::create([
            'vessel_id' => $vessel->id,
            'equipment_category_id' => EquipmentCategory::firstWhere('code', 'ME')->id,
            'code' => 'ME-'.$vessel->code,
            'name' => 'Main Engine',
            'meter_type' => 'running_hours',
        ]);
    }

    /** @return \Illuminate\Testing\TestResponse */
    protected function asOperator(Operator $operator)
    {
        $user = $this->makeUser(Roles::OPERATOR, $operator);
        Sanctum::actingAs($user);
        app(OperatorContext::class)->set($operator->id);

        return $this;
    }

    // -- the boundary --------------------------------------------------------

    public function test_an_operator_sees_only_its_own_vessels(): void
    {
        $this->asOperator($this->coopA);

        $names = collect($this->getJson('/api/vessels')->assertOk()->json('data'))->pluck('name');

        $this->assertContains('MV Sagarika', $names);
        $this->assertNotContains('MV Bhagirathi', $names);
    }

    public function test_another_operators_vessel_is_not_reachable_by_id(): void
    {
        $this->asOperator($this->coopA);

        $this->getJson('/api/vessels/'.$this->vesselB->id)->assertNotFound();
    }

    public function test_equipment_is_filtered_through_its_vessel(): void
    {
        $this->engineOn($this->vesselA);
        $engineB = $this->engineOn($this->vesselB);

        $this->asOperator($this->coopA);

        $codes = collect($this->getJson('/api/equipment')->assertOk()->json('data'))->pluck('code');

        $this->assertContains('ME-MV-A', $codes);
        $this->assertNotContains('ME-MV-B', $codes);
        $this->getJson('/api/equipment/'.$engineB->id)->assertNotFound();
    }

    public function test_work_orders_are_filtered_through_the_vessel(): void
    {
        $engineB = $this->engineOn($this->vesselB);

        $order = new WorkOrder([
            'equipment_id' => $engineB->id,
            'type' => 'breakdown',
            'description' => 'Fuel pump seizure on B',
        ]);
        $order->forceFill(['number' => 'WO-TEST-1', 'status' => 'draft'])->save();

        $this->asOperator($this->coopA);

        $this->assertSame(0, WorkOrder::count());
        $this->getJson('/api/work-orders/'.$order->id)->assertNotFound();
    }

    /** Shore equipment has no vessel, so it stays with the department. */
    public function test_shore_equipment_is_invisible_to_operators(): void
    {
        $location = \App\Models\Location::create(['code' => 'GHAT1', 'name' => 'Howrah Ghat', 'type' => 'ghat']);

        Equipment::create([
            'location_id' => $location->id,
            'equipment_category_id' => EquipmentCategory::firstWhere('code', 'ME')->id,
            'code' => 'HOIST-1',
            'name' => 'Gangway Hoist',
        ]);

        $this->asOperator($this->coopA);

        $codes = collect($this->getJson('/api/equipment')->assertOk()->json('data'))->pluck('code');
        $this->assertNotContains('HOIST-1', $codes);
    }

    // -- the department ------------------------------------------------------

    public function test_the_department_sees_every_operators_fleet(): void
    {
        Sanctum::actingAs($this->makeUser(Roles::PLANNER));
        app(OperatorContext::class)->set(null);

        $names = collect($this->getJson('/api/vessels')->assertOk()->json('data'))->pluck('name');

        $this->assertContains('MV Sagarika', $names);
        $this->assertContains('MV Bhagirathi', $names);
    }

    public function test_an_auditor_reads_across_all_operators(): void
    {
        Sanctum::actingAs($this->makeUser(Roles::AUDITOR));
        app(OperatorContext::class)->set(null);

        $this->assertSame(2, Vessel::count());
    }

    // -- the context itself ---------------------------------------------------

    public function test_unscoped_lifts_the_filter_then_restores_it(): void
    {
        $context = app(OperatorContext::class);

        $context->runFor($this->coopA, function () use ($context) {
            $this->assertSame(1, Vessel::count());
            $this->assertSame(2, $context->unscoped(fn () => Vessel::count()));
            $this->assertSame(1, Vessel::count());
        });
    }

    /** Scheduled work runs for the whole fleet, with no operator in context. */
    public function test_no_operator_context_means_the_whole_fleet(): void
    {
        app(OperatorContext::class)->set(null);

        $this->assertSame(2, Vessel::count());
    }

    public function test_a_vessel_transfer_moves_only_the_assignment(): void
    {
        $engine = $this->engineOn($this->vesselA);

        $this->vesselA->update(['operator_id' => $this->coopB->id]);

        // The equipment did not move; only who holds the vessel changed.
        app(OperatorContext::class)->runFor($this->coopB, function () use ($engine) {
            $this->assertSame(1, Equipment::where('id', $engine->id)->count());
        });

        app(OperatorContext::class)->runFor($this->coopA, function () use ($engine) {
            $this->assertSame(0, Equipment::where('id', $engine->id)->count());
        });
    }
}
