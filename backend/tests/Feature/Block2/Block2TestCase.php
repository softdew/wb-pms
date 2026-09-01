<?php

namespace Tests\Feature\Block2;

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

abstract class Block2TestCase extends TestCase
{
    use RefreshDatabase;

    protected Organisation $org;

    protected User $engineer;

    protected User $authority;

    protected Vessel $vessel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organisation::create(['code' => 'WBTC', 'name' => 'Test Operator']);
        app(ReferenceDataSeeder::class)->run($this->org);

        app(Tenancy::class)->set($this->org);

        $this->engineer = User::create([
            'organisation_id' => $this->org->id,
            'name' => 'Assessing Engineer',
            'email' => 'engineer@test.local',
            'password' => 'secret-password',
        ]);

        $this->authority = User::create([
            'organisation_id' => $this->org->id,
            'name' => 'Technical Authority',
            'email' => 'authority@test.local',
            'password' => 'secret-password',
        ]);

        $shipType = ShipType::create(['code' => 'FERRY', 'name' => 'Passenger Ferry']);

        $this->vessel = Vessel::create([
            'ship_type_id' => $shipType->id,
            'code' => 'MV01',
            'name' => 'MV Sagarika',
            'incharge_user_id' => $this->engineer->id,
        ]);
    }

    protected function makeEquipment(array $attributes = []): Equipment
    {
        $category = EquipmentCategory::firstWhere('code', 'ME');

        return Equipment::create(array_merge([
            'vessel_id' => $this->vessel->id,
            'equipment_category_id' => $category?->id,
            'code' => 'ME-'.fake()->unique()->numberBetween(1000, 9999),
            'name' => 'Main Engine',
        ], $attributes));
    }
}
