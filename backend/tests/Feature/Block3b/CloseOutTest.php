<?php

namespace Tests\Feature\Block3b;

use App\Enums\WorkOrderStatus;
use App\Exceptions\MaintenanceRuleException;
use App\Services\StockService;
use App\Services\WorkOrderService;

class CloseOutTest extends Block3bTestCase
{
    protected WorkOrderService $workOrders;

    protected StockService $stock;

    protected function setUp(): void
    {
        parent::setUp();
        $this->workOrders = app(WorkOrderService::class);
        $this->stock = app(StockService::class);
    }

    protected function releasedWorkOrder(array $taskAttributes = [])
    {
        $workOrder = $this->workOrders->raiseFromPlan($this->makeDuePlan($taskAttributes));

        return $this->workOrders->release($workOrder);
    }

    /** All four codes, every time. */
    public function test_close_out_requires_all_four_codes(): void
    {
        $workOrder = $this->releasedWorkOrder();

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('all four coded fields');

        $this->workOrders->complete($workOrder, [
            'failure_mode' => 'BRD',
            'cause' => 'WEA',
            'observations' => 'Filter was heavily fouled.',
        ], $this->engineer);
    }

    public function test_free_text_is_not_a_substitute_for_codes(): void
    {
        $workOrder = $this->releasedWorkOrder();

        try {
            $this->workOrders->complete($workOrder, ['observations' => 'All fine'], $this->engineer);
            $this->fail('Close-out with only free text should be rejected.');
        } catch (MaintenanceRuleException $e) {
            $this->assertStringContainsString('not in place of them', $e->getMessage());
        }
    }

    public function test_an_unknown_code_is_rejected(): void
    {
        $workOrder = $this->releasedWorkOrder();

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('Unknown failure mode code "ZZZ"');

        $this->workOrders->complete($workOrder, $this->validCloseout(['failure_mode' => 'ZZZ']), $this->engineer);
    }

    public function test_a_valid_close_out_completes_the_work_order(): void
    {
        $workOrder = $this->releasedWorkOrder();

        $completed = $this->workOrders->complete(
            $workOrder,
            $this->validCloseout(['meter_at_completion' => 3200, 'observations' => 'Oil and filter renewed.']),
            $this->engineer
        );

        $this->assertSame(WorkOrderStatus::Completed, $completed->status);
        $this->assertNotNull($completed->closeout);
        $this->assertSame('BRD', $completed->closeout->failureMode->code);
        $this->assertSame('WEA', $completed->closeout->cause->code);
        $this->assertSame($this->engineer->id, $completed->closeout->signed_off_by);
        $this->assertNull($completed->backlog_state);
    }

    /** Downtime is split, because availability and the ratio both need it. */
    public function test_downtime_is_captured_under_two_heads(): void
    {
        $workOrder = $this->releasedWorkOrder();

        $completed = $this->workOrders->complete($workOrder, $this->validCloseout([
            'planned_downtime_hours' => 6,
            'unplanned_downtime_hours' => 2.5,
        ]), $this->engineer);

        $this->assertEquals(6, $completed->closeout->planned_downtime_hours);
        $this->assertEquals(2.5, $completed->closeout->unplanned_downtime_hours);
        $this->assertSame(8.5, $completed->closeout->totalDowntimeHours());
    }

    public function test_mandatory_readings_must_be_captured_first(): void
    {
        $plan = $this->makeDuePlan();
        $plan->task->readings()->create([
            'parameter' => 'Lube oil pressure', 'unit' => 'bar', 'minimum' => 3.5, 'maximum' => 5.5,
        ]);

        $workOrder = $this->workOrders->release($this->workOrders->raiseFromPlan($plan));

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('mandatory reading');

        $this->workOrders->complete($workOrder, $this->validCloseout(), $this->engineer);
    }

    public function test_a_captured_reading_is_judged_against_its_limits(): void
    {
        $plan = $this->makeDuePlan();
        $plan->task->readings()->create([
            'parameter' => 'Lube oil pressure', 'unit' => 'bar', 'minimum' => 3.5, 'maximum' => 5.5,
        ]);

        $workOrder = $this->workOrders->release($this->workOrders->raiseFromPlan($plan));

        $workOrder->readings->first()->capture(2.8, 'Below limit, pump investigated.');
        $this->assertFalse($workOrder->readings()->first()->is_within_limits);

        $workOrder->readings()->first()->capture(4.2);
        $this->assertTrue($workOrder->readings()->first()->is_within_limits);

        $completed = $this->workOrders->complete($workOrder->refresh(), $this->validCloseout(), $this->engineer);
        $this->assertSame(WorkOrderStatus::Completed, $completed->status);
    }

    /** Completing rolls the plan forward using the reading taken at the time. */
    public function test_completion_rolls_the_plan_forward(): void
    {
        $plan = $this->makeDuePlan();
        $workOrder = $this->workOrders->release($this->workOrders->raiseFromPlan($plan));

        $this->workOrders->complete($workOrder, $this->validCloseout(['meter_at_completion' => 3200]), $this->engineer);

        $plan->refresh();

        $this->assertEquals(3200, $plan->last_done_meter_reading);
        $this->assertEquals(3700, $plan->next_due_meter_reading);
    }

    public function test_a_completed_work_order_can_be_closed(): void
    {
        $workOrder = $this->releasedWorkOrder();
        $completed = $this->workOrders->complete($workOrder, $this->validCloseout(), $this->engineer);

        $this->assertSame(WorkOrderStatus::Closed, $this->workOrders->close($completed)->status);
    }

    public function test_consumption_is_booked_against_the_work_order(): void
    {
        $plan = $this->makeDuePlan();
        $part = $this->makePart();
        $plan->task->parts()->create(['part_id' => $part->id, 'quantity' => 2]);
        $this->stock->receive($part, $this->operator, 10);

        $workOrder = $this->workOrders->release($this->workOrders->raiseFromPlan($plan));

        $this->assertSame(1, $this->stock->issueForWorkOrder($workOrder, $this->engineer));
        $this->assertEquals(8, $this->stock->stockFor($part, $this->operator)->stock_qty);
        $this->assertSame(1, $workOrder->stockTransactions()->count());
        $this->assertEquals(2, $workOrder->parts()->first()->actual_quantity);
    }
}
