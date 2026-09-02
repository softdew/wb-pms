<?php

namespace Tests\Feature\Api;

use App\Enums\MeterType;
use App\Models\ChecklistTask;
use App\Models\Equipment;
use App\Models\ShipType;
use App\Models\Vessel;
use App\Services\PlanDerivationService;

/**
 * The domain rules must hold over HTTP, not only in the service layer -- and a
 * refused rule must read as a 422 with a usable message, not a 500.
 */
class WorkOrderApiTest extends ApiTestCase
{
    protected function duePlanId(): int
    {
        return $this->within($this->alpha, function () {
            $type = ShipType::create(['code' => 'FERRY', 'name' => 'Ferry']);
            $vessel = Vessel::create(['ship_type_id' => $type->id, 'code' => 'MV01', 'name' => 'MV Sagarika']);

            $engine = Equipment::create([
                'vessel_id' => $vessel->id,
                'equipment_category_id' => $this->categoryFor($this->alpha)->id,
                'code' => 'ME-001',
                'name' => 'Main Engine',
                'meter_type' => MeterType::RunningHours,
            ]);

            $engine->forceFill([
                'current_meter_reading' => 3200,
                'current_meter_reading_on' => now()->toDateString(),
            ])->save();

            $task = ChecklistTask::create([
                'equipment_category_id' => $engine->equipment_category_id,
                'code' => 'ME-OIL',
                'activity_description' => 'Change engine oil',
                'default_interval_value' => 500,
                'default_interval_unit' => 'hours',
                'default_trigger_class' => 'meter',
            ]);

            return app(PlanDerivationService::class)
                ->apply($engine->refresh(), $task, ['last_done_meter_reading' => 2600])
                ->id;
        });
    }

    public function test_a_work_order_is_raised_and_released(): void
    {
        $planId = $this->duePlanId();

        $workOrder = $this->actingAsApi($this->alphaUser)
            ->postJson('/api/work-orders/from-plan', ['maintenance_plan_id' => $planId])
            ->assertCreated()
            ->assertJsonPath('status', 'draft')
            ->json();

        $this->actingAsApi($this->alphaUser)
            ->postJson('/api/work-orders/'.$workOrder['id'].'/release')
            ->assertOk()
            ->assertJsonPath('status', 'released');
    }

    /** A refused domain rule is a 422 with the reason, not a 500. */
    public function test_incomplete_close_out_is_refused_with_a_usable_message(): void
    {
        $planId = $this->duePlanId();

        $id = $this->actingAsApi($this->alphaUser)
            ->postJson('/api/work-orders/from-plan', ['maintenance_plan_id' => $planId])
            ->json('id');

        $this->actingAsApi($this->alphaUser)->postJson('/api/work-orders/'.$id.'/release');

        $this->actingAsApi($this->alphaUser)
            ->postJson('/api/work-orders/'.$id.'/complete', [
                'failure_mode' => 'BRD',
                'cause' => 'WEA',
                'detection_method' => 'PMI',
                'severity' => 'ZZZ',
            ])
            ->assertStatus(422)
            ->assertJsonPath('error', 'maintenance_rule');
    }

    public function test_a_valid_close_out_completes_the_work_order(): void
    {
        $planId = $this->duePlanId();

        $id = $this->actingAsApi($this->alphaUser)
            ->postJson('/api/work-orders/from-plan', ['maintenance_plan_id' => $planId])
            ->json('id');

        $this->actingAsApi($this->alphaUser)->postJson('/api/work-orders/'.$id.'/release');

        $this->actingAsApi($this->alphaUser)
            ->postJson('/api/work-orders/'.$id.'/complete', [
                'failure_mode' => 'BRD',
                'cause' => 'WEA',
                'detection_method' => 'PMI',
                'severity' => 'INC',
                'planned_downtime_hours' => 6,
                'meter_at_completion' => 3200,
            ])
            ->assertOk()
            ->assertJsonPath('status', 'completed');
    }

    public function test_the_backlog_reports_all_three_states(): void
    {
        $this->duePlanId();

        $this->actingAsApi($this->alphaUser)
            ->getJson('/api/work-orders/backlog')
            ->assertOk()
            ->assertJsonStructure([
                'ready_to_execute' => ['label', 'count'],
                'waiting_on_material' => ['label', 'count'],
                'waiting_on_asset_availability' => ['label', 'count'],
            ]);
    }
}
