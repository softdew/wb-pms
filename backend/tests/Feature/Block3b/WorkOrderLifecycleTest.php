<?php

namespace Tests\Feature\Block3b;

use App\Enums\BacklogState;
use App\Enums\PartLineType;
use App\Enums\WorkOrderStatus;
use App\Enums\WorkOrderType;
use App\Exceptions\MaintenanceRuleException;
use App\Models\WorkOrder;
use App\Services\StockService;
use App\Services\WorkOrderService;

class WorkOrderLifecycleTest extends Block3bTestCase
{
    protected WorkOrderService $workOrders;

    protected StockService $stock;

    protected function setUp(): void
    {
        parent::setUp();
        $this->workOrders = app(WorkOrderService::class);
        $this->stock = app(StockService::class);
    }

    public function test_a_work_order_is_raised_from_a_due_plan(): void
    {
        $workOrder = $this->workOrders->raiseFromPlan($this->makeDuePlan());

        $this->assertSame(WorkOrderStatus::Draft, $workOrder->status);
        $this->assertSame(WorkOrderType::Preventive, $workOrder->type);
        $this->assertSame('Change engine oil', $workOrder->description);
        $this->assertStringStartsWith('WO-', $workOrder->number);
    }

    public function test_numbers_run_in_sequence(): void
    {
        $first = $this->workOrders->raiseFromPlan($this->makeDuePlan());
        $second = $this->workOrders->raiseFromPlan($this->makeDuePlan());

        $this->assertSame('WO-'.now()->format('Y').'-00001', $first->number);
        $this->assertSame('WO-'.now()->format('Y').'-00002', $second->number);
    }

    /** Two open orders for one plan line would double the work. */
    public function test_a_plan_line_cannot_have_two_open_work_orders(): void
    {
        $plan = $this->makeDuePlan();

        $first = $this->workOrders->raiseFromPlan($plan);
        $second = $this->workOrders->raiseFromPlan($plan);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, WorkOrder::count());
    }

    /**
     * The snapshot. Editing the library afterwards must not change what a
     * closed work order says was done.
     */
    public function test_the_task_definition_is_snapshotted_at_raise(): void
    {
        $plan = $this->makeDuePlan();
        $workOrder = $this->workOrders->raiseFromPlan($plan);

        $plan->task->update([
            'activity_description' => 'Completely different activity',
            'controlling_reference' => '9.9.9',
        ]);

        $snapshot = $workOrder->refresh()->task_snapshot;

        $this->assertSame('Change engine oil', $snapshot['activity_description']);
        $this->assertSame('5.1.2', $snapshot['controlling_reference']);
    }

    public function test_readings_and_parts_are_copied_onto_the_work_order(): void
    {
        $plan = $this->makeDuePlan();
        $part = $this->makePart(['name' => 'Oil filter cartridge']);

        $plan->task->readings()->create([
            'parameter' => 'Lube oil pressure', 'unit' => 'bar', 'minimum' => 3.5, 'maximum' => 5.5,
        ]);
        $plan->task->parts()->create([
            'part_id' => $part->id, 'quantity' => 2, 'line_type' => PartLineType::Spare,
        ]);

        $workOrder = $this->workOrders->raiseFromPlan($plan);

        $this->assertSame(1, $workOrder->readings()->count());
        $this->assertSame(1, $workOrder->parts()->count());
        $this->assertEquals(2, $workOrder->parts->first()->planned_quantity);
        $this->assertEquals(3.5, $workOrder->readings->first()->minimum);
    }

    /** Closing before completing is refused, with the reason that matters. */
    public function test_a_work_order_cannot_be_closed_before_it_is_completed(): void
    {
        $workOrder = $this->workOrders->raiseFromPlan($this->makeDuePlan());

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('cannot be closed before it has been completed');

        $this->workOrders->close($workOrder);
    }

    /** The transition table itself: a cancelled order is terminal. */
    public function test_the_status_sequence_is_enforced(): void
    {
        $workOrder = $this->workOrders->raiseFromPlan($this->makeDuePlan());
        $cancelled = $this->workOrders->cancel($workOrder, 'Vessel sold.');

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('cannot move to released');

        $this->workOrders->release($cancelled);
    }

    public function test_a_work_order_moves_through_release_and_start(): void
    {
        $workOrder = $this->workOrders->raiseFromPlan($this->makeDuePlan());

        $this->assertSame(WorkOrderStatus::Released, $this->workOrders->release($workOrder)->status);
        $this->assertSame(WorkOrderStatus::InProgress, $this->workOrders->start($workOrder->refresh(), $this->engineer)->status);
    }

    // -- backlog ------------------------------------------------------------

    public function test_a_work_order_with_stock_on_hand_is_ready_to_execute(): void
    {
        $plan = $this->makeDuePlan();
        $part = $this->makePart();
        $plan->task->parts()->create(['part_id' => $part->id, 'quantity' => 2]);
        $this->stock->receive($part, 10);

        $workOrder = $this->workOrders->raiseFromPlan($plan);

        $this->assertSame(BacklogState::ReadyToExecute, $workOrder->backlog_state);
    }

    public function test_a_work_order_short_of_stock_is_waiting_on_material(): void
    {
        $plan = $this->makeDuePlan();
        $part = $this->makePart();
        $plan->task->parts()->create(['part_id' => $part->id, 'quantity' => 5]);
        $this->stock->receive($part, 1);

        $workOrder = $this->workOrders->raiseFromPlan($plan);

        $this->assertSame(BacklogState::WaitingOnMaterial, $workOrder->backlog_state);
    }

    public function test_a_work_order_on_a_laid_up_vessel_is_waiting_on_the_asset(): void
    {
        $plan = $this->makeDuePlan();
        $this->vessel->update(['status' => 'laid_up']);

        $workOrder = $this->workOrders->raiseFromPlan($plan);

        $this->assertSame(BacklogState::WaitingOnAssetAvailability, $workOrder->backlog_state);
    }

    public function test_breakdown_work_is_raised_against_the_asset(): void
    {
        $workOrder = $this->workOrders->raiseBreakdown($this->makeEngine(), 'Fuel pump seizure');

        $this->assertSame(WorkOrderType::Breakdown, $workOrder->type);
        $this->assertTrue($workOrder->type->isUnplanned());
        $this->assertNull($workOrder->maintenance_plan_id);
    }
}
