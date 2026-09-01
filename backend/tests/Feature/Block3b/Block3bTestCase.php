<?php

namespace Tests\Feature\Block3b;

use App\Enums\MeterType;
use App\Models\ChecklistTask;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\MaintenancePlan;
use App\Models\Organisation;
use App\Models\Part;
use App\Models\ShipType;
use App\Models\User;
use App\Models\Vessel;
use App\Services\PlanDerivationService;
use App\Support\Tenancy;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class Block3bTestCase extends TestCase
{
    use RefreshDatabase;

    protected Organisation $org;

    protected User $engineer;

    protected Vessel $vessel;

    protected EquipmentCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organisation::create(['code' => 'WBTC', 'name' => 'Test Operator']);
        app(ReferenceDataSeeder::class)->run($this->org);
        app(Tenancy::class)->set($this->org);

        $this->engineer = User::create([
            'organisation_id' => $this->org->id,
            'name' => 'Engineer',
            'email' => 'engineer@test.local',
            'password' => 'secret-password',
        ]);

        $shipType = ShipType::create(['code' => 'FERRY', 'name' => 'Passenger Ferry']);
        $this->vessel = Vessel::create(['ship_type_id' => $shipType->id, 'code' => 'MV01', 'name' => 'MV Sagarika']);
        $this->category = EquipmentCategory::firstWhere('code', 'ME');
    }

    protected function makeEngine(array $attributes = []): Equipment
    {
        return Equipment::create(array_merge([
            'vessel_id' => $this->vessel->id,
            'equipment_category_id' => $this->category->id,
            'code' => 'ME-'.fake()->unique()->numberBetween(1000, 9999),
            'name' => 'Main Engine',
            'meter_type' => MeterType::RunningHours,
        ], $attributes));
    }

    protected function makePart(array $attributes = []): Part
    {
        return Part::create(array_merge([
            'code' => 'P-'.fake()->unique()->numberBetween(1000, 9999),
            'name' => 'Oil filter',
            'uom' => 'nos',
            'unit_cost' => 500,
        ], $attributes));
    }

    protected function makeTask(array $attributes = []): ChecklistTask
    {
        return ChecklistTask::create(array_merge([
            'equipment_category_id' => $this->category->id,
            'code' => 'T-'.fake()->unique()->numberBetween(1000, 9999),
            'activity_description' => 'Change engine oil',
            'default_interval_value' => 500,
            'default_interval_unit' => 'hours',
            'default_trigger_class' => 'meter',
            'controlling_reference' => '5.1.2',
            'estimated_hours' => 4,
        ], $attributes));
    }

    protected function makeDuePlan(array $taskAttributes = []): MaintenancePlan
    {
        $engine = $this->makeEngine();
        $engine->forceFill([
            'current_meter_reading' => 3200,
            'current_meter_reading_on' => now()->toDateString(),
        ])->save();

        return app(PlanDerivationService::class)->apply(
            $engine->refresh(),
            $this->makeTask($taskAttributes),
            ['last_done_meter_reading' => 2600] // 600 run against a 500 interval
        );
    }

    /** The four codes every close-out needs. */
    protected function validCloseout(array $overrides = []): array
    {
        return array_merge([
            'failure_mode' => 'BRD',
            'cause' => 'WEA',
            'detection_method' => 'PMI',
            'severity' => 'INC',
            'planned_downtime_hours' => 6,
            'unplanned_downtime_hours' => 0,
        ], $overrides);
    }
}
