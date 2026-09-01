<?php

namespace Tests\Feature\Block2;

use App\Enums\MeterType;
use App\Exceptions\MaintenanceRuleException;
use App\Services\MeterReadingService;
use Illuminate\Support\Carbon;

class MeterReadingTest extends Block2TestCase
{
    protected MeterReadingService $meters;

    protected function setUp(): void
    {
        parent::setUp();
        $this->meters = app(MeterReadingService::class);
    }

    protected function meteredEngine()
    {
        return $this->makeEquipment(['meter_type' => MeterType::RunningHours]);
    }

    public function test_a_reading_updates_the_current_figure(): void
    {
        $engine = $this->meteredEngine();

        $this->meters->record($engine, 3200, now(), $this->engineer);

        $engine->refresh();

        $this->assertEquals(3200, $engine->current_meter_reading);
        $this->assertSame(1, $engine->meterReadings()->count());
    }

    public function test_an_unmetered_asset_rejects_readings(): void
    {
        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('no meter defined');

        $this->meters->record($this->makeEquipment(), 100, now(), $this->engineer);
    }

    public function test_a_reading_cannot_go_backwards(): void
    {
        $engine = $this->meteredEngine();
        $this->meters->record($engine, 3200, now()->subDay(), $this->engineer);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('is lower than the reading of');

        $this->meters->record($engine->refresh(), 3100, now(), $this->engineer);
    }

    /** A replaced hour meter legitimately reads lower, but must be declared. */
    public function test_a_declared_reset_is_accepted(): void
    {
        $engine = $this->meteredEngine();
        $this->meters->record($engine, 3200, now()->subDay(), $this->engineer);

        $reading = $this->meters->record(
            $engine->refresh(), 0, now(), $this->engineer,
            isReset: true, remarks: 'Hour meter replaced.'
        );

        $this->assertTrue($reading->is_reset);
        $this->assertEquals(3200, $reading->previous_value);
        $this->assertEquals(0, $engine->refresh()->current_meter_reading);
    }

    public function test_future_and_negative_readings_are_rejected(): void
    {
        $engine = $this->meteredEngine();

        try {
            $this->meters->record($engine, 100, now()->addWeek(), $this->engineer);
            $this->fail('A future-dated reading should be rejected.');
        } catch (MaintenanceRuleException $e) {
            $this->assertStringContainsString('future', $e->getMessage());
        }

        $this->expectException(MaintenanceRuleException::class);
        $this->meters->record($engine, -5, now(), $this->engineer);
    }

    /** Correcting the past must not rewrite the present. */
    public function test_a_back_dated_reading_does_not_move_the_current_figure(): void
    {
        $engine = $this->meteredEngine();
        $this->meters->record($engine, 3200, now(), $this->engineer);
        $this->meters->record($engine->refresh(), 3100, now()->subMonth(), $this->engineer);

        $engine->refresh();

        $this->assertEquals(3200, $engine->current_meter_reading);
        $this->assertSame(2, $engine->meterReadings()->count());
    }

    /** The client's "running hours last month" column. */
    public function test_usage_between_two_dates(): void
    {
        $engine = $this->meteredEngine();

        $this->meters->record($engine, 2600, Carbon::parse('2026-07-01'), $this->engineer);
        $this->meters->record($engine->refresh(), 2900, Carbon::parse('2026-08-01'), $this->engineer);
        $this->meters->record($engine->refresh(), 3200, Carbon::parse('2026-09-01'), $this->engineer);

        $this->assertSame(
            300.0,
            $this->meters->usageBetween($engine, Carbon::parse('2026-08-01'), Carbon::parse('2026-09-01'))
        );

        $this->assertSame(
            600.0,
            $this->meters->usageBetween($engine, Carbon::parse('2026-07-01'), Carbon::parse('2026-09-01'))
        );
    }

    /**
     * The arithmetic on the client's Main Engine sheet: interval 500, last
     * overhaul at 3100 hrs, current 3200, so 100 hrs run and 400 to go.
     */
    public function test_hours_since_the_last_completion(): void
    {
        $engine = $this->meteredEngine();
        $this->meters->record($engine, 3200, now(), $this->engineer);

        $hoursSince = $this->meters->usageSince($engine->refresh(), 3100);

        $this->assertSame(100.0, $hoursSince);
        $this->assertSame(400.0, 500 - $hoursSince);
    }

    public function test_readings_are_scoped_to_the_organisation(): void
    {
        $engine = $this->meteredEngine();
        $this->meters->record($engine, 3200, now(), $this->engineer);

        $reading = $engine->meterReadings()->first();

        $this->assertSame($this->org->id, $reading->organisation_id);
    }
}
