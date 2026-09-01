<?php

namespace Tests\Feature\Block3;

use App\Enums\MeterType;
use App\Models\ChecklistTask;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\Organisation;
use App\Models\ShipType;
use App\Models\User;
use App\Models\Vessel;
use App\Support\Tenancy;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class Block3TestCase extends TestCase
{
    use RefreshDatabase;

    protected Organisation $org;

    protected User $engineer;

    protected Vessel $vessel;

    protected EquipmentCategory $mainEngineCategory;

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
        $this->mainEngineCategory = EquipmentCategory::firstWhere('code', 'ME');
    }

    protected function makeEngine(array $attributes = []): Equipment
    {
        return Equipment::create(array_merge([
            'vessel_id' => $this->vessel->id,
            'equipment_category_id' => $this->mainEngineCategory->id,
            'code' => 'ME-'.fake()->unique()->numberBetween(1000, 9999),
            'name' => 'Main Engine',
            'meter_type' => MeterType::RunningHours,
        ], $attributes));
    }

    protected function makeTask(array $attributes = []): ChecklistTask
    {
        return ChecklistTask::create(array_merge([
            'equipment_category_id' => $this->mainEngineCategory->id,
            'code' => 'T-'.fake()->unique()->numberBetween(1000, 9999),
            'activity_description' => 'Change engine oil',
            'default_interval_value' => 500,
            'default_interval_unit' => 'hours',
            'default_trigger_class' => 'meter',
        ], $attributes));
    }

    /** Set the asset's current meter without going through the reading service. */
    protected function setMeter(Equipment $equipment, float $value): Equipment
    {
        $equipment->forceFill([
            'current_meter_reading' => $value,
            'current_meter_reading_on' => now()->toDateString(),
        ])->save();

        return $equipment->refresh();
    }
}
