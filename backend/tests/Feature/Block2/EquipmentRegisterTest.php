<?php

namespace Tests\Feature\Block2;

use App\Enums\TaxonomyLevel;
use App\Models\Equipment;
use App\Models\Location;
use Illuminate\Database\QueryException;

class EquipmentRegisterTest extends Block2TestCase
{
    public function test_equipment_nests_to_component_level(): void
    {
        $engine = $this->makeEquipment([
            'name' => 'Main Engine',
            'taxonomy_level' => TaxonomyLevel::EquipmentUnit,
        ]);

        $turbo = $this->makeEquipment([
            'name' => 'Turbocharger',
            'parent_id' => $engine->id,
            'taxonomy_level' => TaxonomyLevel::SubUnit,
        ]);

        $bearing = $this->makeEquipment([
            'name' => 'Bearing',
            'parent_id' => $turbo->id,
            'taxonomy_level' => TaxonomyLevel::Component,
        ]);

        $this->assertSame('Main Engine / Turbocharger / Bearing', $bearing->ancestry());
        $this->assertSame(1, $engine->children()->count());
    }

    public function test_shore_equipment_sits_at_a_location_not_a_vessel(): void
    {
        $ghat = Location::create(['code' => 'GHAT1', 'name' => 'Howrah Ghat', 'type' => 'ghat']);

        $hoist = Equipment::create([
            'location_id' => $ghat->id,
            'code' => 'HOIST-1',
            'name' => 'Gangway Hoist',
        ]);

        $this->assertNull($hoist->vessel_id);
        $this->assertSame('Howrah Ghat', $hoist->location->name);
    }

    /** An asset with no vessel and no location cannot be found or worked on. */
    public function test_equipment_must_belong_to_a_vessel_or_a_location(): void
    {
        $this->expectException(QueryException::class);

        Equipment::create(['code' => 'ORPHAN-1', 'name' => 'Nowhere']);
    }

    public function test_codes_are_unique_within_an_organisation(): void
    {
        $this->makeEquipment(['code' => 'ME-001']);

        $this->expectException(QueryException::class);

        $this->makeEquipment(['code' => 'ME-001']);
    }

    public function test_scopes_filter_the_register(): void
    {
        $this->makeEquipment(['meter_type' => 'running_hours']);
        $this->makeEquipment();

        $this->assertSame(1, Equipment::metered()->count());
        $this->assertSame(2, Equipment::awaitingCriticality()->count());
    }
}
