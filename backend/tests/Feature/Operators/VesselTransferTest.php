<?php

namespace Tests\Feature\Operators;

use App\Enums\MeterType;
use App\Exceptions\MaintenanceRuleException;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\Operator;
use App\Models\Organisation;
use App\Models\ShipType;
use App\Models\User;
use App\Models\Vessel;
use App\Models\VesselAssignment;
use App\Models\VesselIncharge;
use App\Models\WorkOrder;
use App\Services\VesselTransferService;
use App\Support\OperatorContext;
use App\Support\Tenancy;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * A vessel changing hands at the end of a tender.
 *
 * The point of these is what does *not* happen: the maintenance history stays
 * with the vessel. Had operators been tenants, every transfer would have meant
 * re-stamping ten tables and orphaning the audit trail.
 */
class VesselTransferTest extends TestCase
{
    use RefreshDatabase;

    protected Organisation $org;

    protected Operator $coopA;

    protected Operator $coopB;

    protected Vessel $vessel;

    protected User $admin;

    protected VesselTransferService $transfers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organisation::create(['code' => 'WBTC', 'name' => 'WB Transport Corporation']);
        app(ReferenceDataSeeder::class)->run($this->org);
        app(Tenancy::class)->set($this->org);
        app(OperatorContext::class)->set(null);

        $this->transfers = app(VesselTransferService::class);

        $this->admin = User::create([
            'organisation_id' => $this->org->id,
            'name' => 'Department Admin',
            'email' => 'admin@wbtc.test',
            'password' => 'secret-password',
        ]);

        $this->coopA = Operator::create([
            'code' => 'COOPA', 'name' => 'Hooghly Society', 'type' => 'cooperative_society',
            'agreement_no' => 'AGR/2024/11', 'tender_reference' => 'TND/2024/07',
        ]);

        $this->coopB = Operator::create([
            'code' => 'COOPB', 'name' => 'Ganga Society', 'type' => 'cooperative_society',
            'agreement_no' => 'AGR/2029/04',
        ]);

        $type = ShipType::create(['code' => 'FERRY', 'name' => 'Passenger Ferry']);
        $this->vessel = Vessel::create(['ship_type_id' => $type->id, 'code' => 'MV01', 'name' => 'MV Sagarika']);
    }

    protected function engine(): Equipment
    {
        $engine = Equipment::create([
            'vessel_id' => $this->vessel->id,
            'equipment_category_id' => EquipmentCategory::firstWhere('code', 'ME')->id,
            'code' => 'ME-001',
            'name' => 'Main Engine',
            'meter_type' => MeterType::RunningHours,
        ]);

        $engine->forceFill([
            'current_meter_reading' => 3200,
            'current_meter_reading_on' => now()->toDateString(),
        ])->save();

        return $engine->refresh();
    }

    // -- assignment ----------------------------------------------------------

    public function test_a_vessel_is_assigned_to_its_first_operator(): void
    {
        $assignment = $this->transfers->assign($this->vessel, $this->coopA, Carbon::parse('2024-04-01'));

        $this->assertSame($this->coopA->id, $this->vessel->refresh()->operator_id);
        $this->assertSame('AGR/2024/11', $assignment->agreement_no);
        $this->assertTrue($assignment->isCurrent());
    }

    public function test_an_assigned_vessel_cannot_be_assigned_again(): void
    {
        $this->transfers->assign($this->vessel, $this->coopA);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('already assigned');

        $this->transfers->assign($this->vessel->refresh(), $this->coopB);
    }

    // -- the transfer ---------------------------------------------------------

    /** The whole point: nothing but the assignment moves. */
    public function test_the_maintenance_history_stays_with_the_vessel(): void
    {
        $this->transfers->assign($this->vessel, $this->coopA, Carbon::parse('2024-04-01'));
        $engine = $this->engine();

        $order = new WorkOrder([
            'equipment_id' => $engine->id,
            'type' => 'breakdown',
            'description' => 'Fuel pump seizure',
        ]);
        $order->forceFill([
            'number' => 'WO-2026-00001',
            'status' => 'draft',
            'operator_id' => $this->coopA->id,
        ])->save();

        $this->transfers->transfer($this->vessel->refresh(), $this->coopB, Carbon::parse('2029-04-01'), [], $this->admin);

        // The equipment, its readings and the work order are all still here.
        $this->assertSame(1, Equipment::where('vessel_id', $this->vessel->id)->count());
        $this->assertEquals(3200, $engine->refresh()->current_meter_reading);
        $this->assertSame(1, WorkOrder::where('equipment_id', $engine->id)->count());

        // And the old work order is still attributed to who actually did it.
        $this->assertSame($this->coopA->id, $order->refresh()->operator_id);
    }

    public function test_the_handover_records_the_position_at_transfer(): void
    {
        $this->transfers->assign($this->vessel, $this->coopA);
        $engine = $this->engine();

        $order = new WorkOrder([
            'equipment_id' => $engine->id, 'type' => 'breakdown', 'description' => 'Outstanding job',
        ]);
        $order->forceFill(['number' => 'WO-1', 'status' => 'released'])->save();

        $handover = $this->transfers->transfer(
            $this->vessel->refresh(),
            $this->coopB,
            Carbon::parse('2029-04-01'),
            ['condition_notes' => 'Hull sound. Starboard gangway damaged.', 'tender_reference' => 'TND/2029/02'],
            $this->admin,
        );

        $this->assertSame($this->coopA->id, $handover->from_operator_id);
        $this->assertSame($this->coopB->id, $handover->to_operator_id);
        $this->assertSame(1, $handover->open_work_orders);
        $this->assertSame('TND/2029/02', $handover->tender_reference);
        $this->assertEquals(3200, $handover->meter_readings[0]['reading']);
        $this->assertStringContainsString('gangway', $handover->condition_notes);
    }

    public function test_a_transfer_closes_the_previous_tenure_and_opens_the_next(): void
    {
        $this->transfers->assign($this->vessel, $this->coopA, Carbon::parse('2024-04-01'));
        $this->transfers->transfer($this->vessel->refresh(), $this->coopB, Carbon::parse('2029-04-01'), [], $this->admin);

        $history = $this->transfers->history($this->vessel->refresh());

        $this->assertCount(2, $history);
        $this->assertSame($this->coopB->id, $history->first()->operator_id);
        $this->assertNull($history->first()->assigned_until);
        $this->assertSame('2029-04-01', $history->last()->assigned_until->toDateString());
    }

    /** The question the department will actually ask. */
    public function test_who_held_the_vessel_on_a_given_date(): void
    {
        $this->transfers->assign($this->vessel, $this->coopA, Carbon::parse('2024-04-01'));
        $this->transfers->transfer($this->vessel->refresh(), $this->coopB, Carbon::parse('2029-04-01'), [], $this->admin);

        $this->assertSame('Hooghly Society', $this->transfers->operatorOn($this->vessel, Carbon::parse('2026-09-01'))->name);
        $this->assertSame('Ganga Society', $this->transfers->operatorOn($this->vessel, Carbon::parse('2030-01-01'))->name);
    }

    public function test_a_vessel_cannot_be_transferred_to_its_current_operator(): void
    {
        $this->transfers->assign($this->vessel, $this->coopA);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('already assigned');

        $this->transfers->transfer($this->vessel->refresh(), $this->coopA);
    }

    // -- in-charge -------------------------------------------------------------

    public function test_an_incharge_is_named_on_a_vessel(): void
    {
        $this->transfers->assign($this->vessel, $this->coopA);

        $incharge = VesselIncharge::create([
            'operator_id' => $this->coopA->id,
            'name' => 'A. Mandal',
            'designation' => 'Chief Engineer',
            'licence_no' => 'IV/ENG/2021/4471',
            'licence_type' => 'Inland Engine Driver, First Class',
            'licence_valid_until' => now()->addYear()->toDateString(),
        ]);

        $this->transfers->assignIncharge($this->vessel->refresh(), $incharge);

        $this->assertSame('A. Mandal', $this->vessel->refresh()->incharge->name);
        $this->assertSame($incharge->id, VesselAssignment::current()->first()->vessel_incharge_id);
    }

    /** An operator cannot put another operator's engineer in charge. */
    public function test_an_incharge_must_work_for_the_holding_operator(): void
    {
        $this->transfers->assign($this->vessel, $this->coopA);

        $theirs = VesselIncharge::create(['operator_id' => $this->coopB->id, 'name' => 'S. Roy']);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('not the operator currently holding');

        $this->transfers->assignIncharge($this->vessel->refresh(), $theirs);
    }

    /** The outgoing operator's chief engineer does not come with the vessel. */
    public function test_a_transfer_clears_the_incharge(): void
    {
        $this->transfers->assign($this->vessel, $this->coopA);

        $incharge = VesselIncharge::create(['operator_id' => $this->coopA->id, 'name' => 'A. Mandal']);
        $this->transfers->assignIncharge($this->vessel->refresh(), $incharge);

        $this->transfers->transfer($this->vessel->refresh(), $this->coopB, null, [], $this->admin);

        $this->assertNull($this->vessel->refresh()->vessel_incharge_id);
    }

    // -- licences ---------------------------------------------------------------

    public function test_an_expired_licence_is_reported_not_blocked(): void
    {
        $lapsed = VesselIncharge::create([
            'operator_id' => $this->coopA->id,
            'name' => 'Expired Holder',
            'licence_no' => 'IV/ENG/2019/1102',
            'licence_valid_until' => now()->subMonth()->toDateString(),
        ]);

        $current = VesselIncharge::create([
            'operator_id' => $this->coopA->id,
            'name' => 'Current Holder',
            'licence_no' => 'IV/ENG/2024/8890',
            'licence_valid_until' => now()->addYear()->toDateString(),
        ]);

        $this->assertTrue($lapsed->licenceHasExpired());
        $this->assertFalse($current->licenceHasExpired());

        $expired = VesselIncharge::withExpiredLicence()->pluck('name');
        $this->assertContains('Expired Holder', $expired);
        $this->assertNotContains('Current Holder', $expired);

        // Reported, not enforced: the vessel can still be assigned to them.
        $this->transfers->assign($this->vessel, $this->coopA);
        $this->transfers->assignIncharge($this->vessel->refresh(), $lapsed);
        $this->assertSame($lapsed->id, $this->vessel->refresh()->vessel_incharge_id);
    }

    public function test_licences_expiring_soon_are_listed(): void
    {
        VesselIncharge::create([
            'operator_id' => $this->coopA->id, 'name' => 'Renewing Soon',
            'licence_valid_until' => now()->addDays(30)->toDateString(),
        ]);

        VesselIncharge::create([
            'operator_id' => $this->coopA->id, 'name' => 'Plenty of Time',
            'licence_valid_until' => now()->addYear()->toDateString(),
        ]);

        $soon = VesselIncharge::withLicenceExpiringWithin(60)->pluck('name');

        $this->assertContains('Renewing Soon', $soon);
        $this->assertNotContains('Plenty of Time', $soon);
    }
}
