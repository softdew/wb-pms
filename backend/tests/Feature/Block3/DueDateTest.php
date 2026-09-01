<?php

namespace Tests\Feature\Block3;

use App\Enums\DueStatus;
use App\Enums\IntervalUnit;
use App\Enums\TriggerClass;
use App\Services\DueDateService;
use App\Services\PlanDerivationService;
use Illuminate\Support\Carbon;

class DueDateTest extends Block3TestCase
{
    protected DueDateService $dueDates;

    protected PlanDerivationService $plans;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dueDates = app(DueDateService::class);
        $this->plans = app(PlanDerivationService::class);
    }

    /**
     * Row 12 of the client's Main Engine sheet: interval 500, last overhaul at
     * 3100 hrs, current 3200. Their sheet shows 100 since and 400 to go, ok.
     */
    public function test_the_clients_main_engine_arithmetic(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 3200);
        $task = $this->makeTask(['activity_description' => 'Lube oil filter cartridge']);

        $plan = $this->plans->apply($engine, $task, [
            'last_done_meter_reading' => 3100,
            'last_done_on' => Carbon::parse('2026-02-09'),
        ]);

        $this->assertSame(100.0, $this->dueDates->consumedSinceCompletion($plan));
        $this->assertSame(400.0, $this->dueDates->remaining($plan));
        $this->assertEquals(3600, $plan->next_due_meter_reading);
        $this->assertSame(DueStatus::OnTrack, $plan->due_status);
        $this->assertSame('ok', $plan->due_status->sheetLabel());
    }

    /** Row 11: interval 500, last done at 2600, current 3200 -> 100 overdue. */
    public function test_an_overdue_meter_task_reports_a_negative_remainder(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 3200);
        $plan = $this->plans->apply($engine, $this->makeTask(), ['last_done_meter_reading' => 2600]);

        $this->assertSame(600.0, $this->dueDates->consumedSinceCompletion($plan));
        $this->assertSame(-100.0, $this->dueDates->remaining($plan));
        $this->assertSame(DueStatus::Due, $plan->due_status);
        $this->assertSame('due', $plan->due_status->sheetLabel());
    }

    /**
     * Row 14: interval 250, last done at 3150, current 3200 -> 200 left, and
     * the client's sheet reads "soon".
     *
     * This is the row that rules out a percentage threshold: 200 of 250 is 80
     * per cent of the interval remaining, yet row 16 with 36 per cent left
     * reads "ok". Their window is an absolute figure between 200 and 400 hours.
     * 250 is the default until they confirm it.
     */
    public function test_the_amber_window_opens_near_the_due_point(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 3200);
        $task = $this->makeTask(['default_interval_value' => 250, 'activity_description' => 'V-belt tension']);

        $plan = $this->plans->apply($engine, $task, ['last_done_meter_reading' => 3150]);

        $this->assertSame(200.0, $this->dueDates->remaining($plan));
        $this->assertSame(DueStatus::DueSoon, $plan->due_status);
        $this->assertSame('soon', $plan->due_status->sheetLabel());
    }

    /** Row 12 again: 400 hrs remaining sits outside the 250-hour window. */
    public function test_just_outside_the_window_stays_green(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 3200);
        $plan = $this->plans->apply($engine, $this->makeTask(), ['last_done_meter_reading' => 3100]);

        $this->assertSame(400.0, $this->dueDates->remaining($plan));
        $this->assertSame(DueStatus::OnTrack, $plan->due_status);
    }

    /** A per-line override beats the organisation default. */
    public function test_a_plan_can_override_the_window(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 3200);

        $plan = $this->plans->apply($engine, $this->makeTask(), [
            'last_done_meter_reading' => 3100,
            'warning_window' => 500,
        ]);

        $this->assertSame(400.0, $this->dueDates->remaining($plan));
        $this->assertSame(DueStatus::DueSoon, $plan->due_status);
    }

    /** Calendar lines use the days window, not the hours one. */
    public function test_a_calendar_line_goes_amber_within_the_days_window(): void
    {
        $engine = $this->makeEngine(['meter_type' => null]);
        $task = $this->makeTask([
            'default_interval_value' => 3,
            'default_interval_unit' => 'months',
            'default_trigger_class' => 'calendar',
        ]);

        $amber = $this->plans->apply($engine, $task, ['last_done_on' => now()->subMonths(3)->addDays(10)]);
        $this->assertSame(DueStatus::DueSoon, $amber->due_status);

        $green = $this->plans->apply($this->makeEngine(['meter_type' => null]), $task, [
            'last_done_on' => now()->subMonth(),
        ]);
        $this->assertSame(DueStatus::OnTrack, $green->due_status);
    }

    /** Row 16: interval 5000, never done, current 3200 -> 1800 left, still ok. */
    public function test_a_long_interval_task_stays_green(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 3200);
        $task = $this->makeTask(['default_interval_value' => 5000, 'activity_description' => 'Clean radiator tubes']);

        $plan = $this->plans->apply($engine, $task);

        $this->assertSame(1800.0, $this->dueDates->remaining($plan));
        $this->assertSame(DueStatus::OnTrack, $plan->due_status);
    }

    /**
     * Rows 7 to 10: short-interval tasks never completed read as permanently
     * due, because the whole running total counts as consumed. This mirrors the
     * client's sheet exactly and is worth raising with them.
     */
    public function test_a_never_completed_short_interval_task_reads_as_due(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 3200);
        $task = $this->makeTask(['default_interval_value' => 10, 'activity_description' => 'Engine oil level']);

        $plan = $this->plans->apply($engine, $task);

        $this->assertSame(-3190.0, $this->dueDates->remaining($plan));
        $this->assertSame(DueStatus::Due, $plan->due_status);
    }

    /** "1st after 50 hours and then every 500 Hrs." */
    public function test_the_first_service_interval_applies_until_the_task_is_done(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 40);
        $task = $this->makeTask(['default_interval_value' => 500, 'first_interval_value' => 50]);

        $plan = $this->plans->apply($engine, $task);

        $this->assertSame(50.0, $plan->effectiveIntervalValue());
        $this->assertEquals(50, $plan->next_due_meter_reading);

        $plan = $this->plans->recordCompletion($plan, now(), 50);

        $this->assertSame(500.0, $plan->effectiveIntervalValue());
        $this->assertEquals(550, $plan->next_due_meter_reading);
    }

    /** The Pumps sheet: "3 Monthly", last done 18/05, next due 18/08. */
    public function test_a_calendar_task_computes_the_next_date(): void
    {
        $engine = $this->makeEngine(['meter_type' => null]);
        $task = $this->makeTask([
            'activity_description' => 'Bearing check',
            'default_interval_value' => 3,
            'default_interval_unit' => 'months',
            'default_trigger_class' => 'calendar',
        ]);

        $plan = $this->plans->apply($engine, $task, [
            'last_done_on' => Carbon::parse('2026-05-18'),
        ]);

        $this->assertSame('2026-08-18', $plan->next_due_on->toDateString());
    }

    public function test_a_calendar_task_past_its_date_is_due(): void
    {
        $engine = $this->makeEngine(['meter_type' => null]);
        $task = $this->makeTask([
            'default_interval_value' => 1,
            'default_interval_unit' => 'months',
            'default_trigger_class' => 'calendar',
        ]);

        $plan = $this->plans->apply($engine, $task, ['last_done_on' => now()->subMonths(3)]);

        $this->assertSame(DueStatus::Due, $plan->due_status);
    }

    /** Condition and event lines are raised by people, not by the clock. */
    public function test_non_automatic_triggers_have_no_computed_due_point(): void
    {
        $engine = $this->makeEngine();
        $task = $this->makeTask(['default_trigger_class' => 'condition']);

        $plan = $this->plans->apply($engine, $task, [
            'trigger_class' => TriggerClass::Condition,
            'condition_parameter' => 'Vibration velocity',
            'condition_limit' => 7.1,
            'unit' => IntervalUnit::Hours,
        ]);

        $this->assertNull($plan->next_due_on);
        $this->assertNull($plan->next_due_meter_reading);
        $this->assertSame(DueStatus::OnTrack, $plan->due_status);
    }

    public function test_the_release_date_allows_for_lead_time(): void
    {
        $engine = $this->makeEngine(['meter_type' => null]);
        $task = $this->makeTask([
            'default_interval_value' => 12,
            'default_interval_unit' => 'months',
            'default_trigger_class' => 'calendar',
        ]);

        $plan = $this->plans->apply($engine, $task, [
            'last_done_on' => Carbon::parse('2026-01-01'),
            'release_lead_days' => 30,
        ]);

        $this->assertSame('2026-12-02', $this->dueDates->releaseOn($plan)->toDateString());
    }

    public function test_a_statutory_outer_limit_caps_an_extension(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 100);
        $plan = $this->plans->apply($engine, $this->makeTask(), ['statutory_outer_limit' => 600]);

        $this->assertFalse($this->dueDates->wouldBreachStatutoryLimit($plan, 550));
        $this->assertTrue($this->dueDates->wouldBreachStatutoryLimit($plan, 700));
    }

    public function test_the_sheet_row_matches_the_clients_columns(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 3200);
        $plan = $this->plans->apply($engine, $this->makeTask(), ['last_done_meter_reading' => 3100]);

        $row = $this->dueDates->sheetRow($plan);

        $this->assertSame('500 hrs', $row['interval']);
        $this->assertSame(100.0, $row['consumed']);
        $this->assertSame(400.0, $row['remaining']);
        $this->assertSame('ok', $row['status']);
    }
}
