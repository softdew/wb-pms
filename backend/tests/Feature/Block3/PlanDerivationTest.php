<?php

namespace Tests\Feature\Block3;

use App\Enums\IntervalUnit;
use App\Enums\TriggerClass;
use App\Exceptions\MaintenanceRuleException;
use App\Models\MaintenancePlan;
use App\Models\Part;
use App\Services\PlanDerivationService;

class PlanDerivationTest extends Block3TestCase
{
    protected PlanDerivationService $plans;

    protected function setUp(): void
    {
        parent::setUp();
        $this->plans = app(PlanDerivationService::class);
    }

    public function test_the_shortest_source_interval_is_applied_by_default(): void
    {
        $plan = $this->plans->apply($this->setMeter($this->makeEngine(), 0), $this->makeTask(), [
            'oem' => 500,
            'statutory' => 750,
            'history' => 400,
        ]);

        $this->assertEquals(400, $plan->applicable_interval_value);
        $this->assertEquals(500, $plan->oem_interval_value);
        $this->assertEquals(750, $plan->statutory_interval_value);
    }

    /** A longer interval than the evidence supports must be justified. */
    public function test_a_longer_interval_requires_a_reason(): void
    {
        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('Record the reason for the departure');

        $this->plans->apply($this->setMeter($this->makeEngine(), 0), $this->makeTask(), [
            'oem' => 500,
            'applicable' => 800,
        ]);
    }

    public function test_a_justified_departure_is_accepted_and_recorded(): void
    {
        $plan = $this->plans->apply($this->setMeter($this->makeEngine(), 0), $this->makeTask(), [
            'oem' => 500,
            'applicable' => 800,
            'reason' => 'Oil analysis supports extension; approved by technical authority.',
        ]);

        $this->assertEquals(800, $plan->applicable_interval_value);
        $this->assertStringContainsString('Oil analysis', $plan->interval_reason);
    }

    public function test_a_meter_task_cannot_be_planned_on_an_unmetered_asset(): void
    {
        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('no meter defined');

        $this->plans->apply($this->makeEngine(['meter_type' => null]), $this->makeTask());
    }

    public function test_a_calendar_task_cannot_carry_an_hours_interval(): void
    {
        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('cannot carry an interval in hours');

        $this->plans->apply($this->makeEngine(['meter_type' => null]), $this->makeTask(), [
            'trigger_class' => TriggerClass::Calendar,
            'unit' => IntervalUnit::Hours,
        ]);
    }

    public function test_a_condition_trigger_needs_a_parameter(): void
    {
        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('parameter being watched');

        $this->plans->apply($this->makeEngine(), $this->makeTask(), [
            'trigger_class' => TriggerClass::Condition,
        ]);
    }

    /** One task, several assets -- the reuse the library exists for. */
    public function test_one_task_applies_to_many_assets(): void
    {
        $task = $this->makeTask();

        foreach (range(1, 3) as $i) {
            $this->plans->apply($this->setMeter($this->makeEngine(), 0), $task);
        }

        $this->assertSame(3, $task->reuseCount());
        $this->assertSame(3, MaintenancePlan::count());
    }

    /** The bulk action that makes onboarding a vessel tractable. */
    public function test_the_whole_category_library_can_be_applied_at_once(): void
    {
        $this->makeTask(['activity_description' => 'Change engine oil']);
        $this->makeTask(['activity_description' => 'Fuel filter']);
        $this->makeTask(['activity_description' => 'Top overhaul', 'default_interval_value' => 5000]);

        $created = $this->plans->applyCategoryLibrary($this->setMeter($this->makeEngine(), 0));

        $this->assertCount(3, $created);
    }

    /** Applying twice must update, not duplicate. */
    public function test_reapplying_a_task_does_not_duplicate_the_plan(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 0);
        $task = $this->makeTask();

        $this->plans->apply($engine, $task, ['oem' => 500]);
        $this->plans->apply($engine, $task, ['oem' => 250]);

        $this->assertSame(1, MaintenancePlan::count());
        $this->assertEquals(250, MaintenancePlan::first()->applicable_interval_value);
    }

    /** Same task, two trigger classes, on one asset. */
    public function test_an_asset_may_carry_the_same_task_under_two_triggers(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 0);
        $task = $this->makeTask();

        $this->plans->apply($engine, $task, ['trigger_class' => TriggerClass::Meter]);
        $this->plans->apply($engine, $task, [
            'trigger_class' => TriggerClass::Calendar,
            'unit' => IntervalUnit::Months,
            'applicable' => 12,
        ]);

        $this->assertSame(2, MaintenancePlan::where('equipment_id', $engine->id)->count());
    }

    /** Release lead time defaults to the longest part lead time on the task. */
    public function test_lead_time_comes_from_the_longest_part_lead_time(): void
    {
        $task = $this->makeTask();

        $filter = Part::create(['code' => 'FLT-1', 'name' => 'Oil filter', 'lead_time_days' => 7]);
        $gasket = Part::create(['code' => 'GSK-1', 'name' => 'Gasket set', 'lead_time_days' => 45]);

        $task->parts()->createMany([
            ['part_id' => $filter->id, 'quantity' => 1],
            ['part_id' => $gasket->id, 'quantity' => 2],
        ]);

        $plan = $this->plans->apply($this->setMeter($this->makeEngine(), 0), $task->refresh());

        $this->assertSame(45, $plan->release_lead_days);
    }

    /** A meter-based completion without a reading cannot be recorded. */
    public function test_completing_a_meter_task_needs_the_reading_at_completion(): void
    {
        $engine = $this->makeEngine();
        $plan = $this->plans->apply($engine, $this->makeTask());

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('meter reading taken at completion');

        $this->plans->recordCompletion($plan);
    }

    public function test_recording_a_completion_rolls_the_plan_forward(): void
    {
        $engine = $this->setMeter($this->makeEngine(), 3200);
        $plan = $this->plans->apply($engine, $this->makeTask(), ['last_done_meter_reading' => 2600]);

        $this->assertEquals(3100, $plan->next_due_meter_reading);

        $plan = $this->plans->recordCompletion($plan, now(), 3200);

        $this->assertEquals(3200, $plan->last_done_meter_reading);
        $this->assertEquals(3700, $plan->next_due_meter_reading);
    }
}
