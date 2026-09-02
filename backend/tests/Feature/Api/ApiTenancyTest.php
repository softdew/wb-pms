<?php

namespace Tests\Feature\Api;

use App\Models\Organisation;
use App\Models\User;
use App\Models\ShipType;
use App\Models\Vessel;

/**
 * Isolation over HTTP.
 *
 * The Block 1 tests prove the scope holds at the model layer. These prove the
 * middleware actually establishes context on a real request, and that a
 * logged-in user of one operator cannot reach another operator's data through
 * the API -- which is the path that matters on a shared deployment.
 */
class ApiTenancyTest extends ApiTestCase
{
    protected function seedVessels(): void
    {
        $this->within($this->alpha, function () {
            $type = ShipType::create(['code' => 'FERRY', 'name' => 'Alpha Ferry']);
            Vessel::create(['ship_type_id' => $type->id, 'code' => 'A1', 'name' => 'Alpha Vessel']);
        });

        $this->within($this->beta, function () {
            $type = ShipType::create(['code' => 'FERRY', 'name' => 'Beta Ferry']);
            Vessel::create(['ship_type_id' => $type->id, 'code' => 'B1', 'name' => 'Beta Vessel']);
        });
    }

    public function test_an_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/vessels')->assertUnauthorized();
    }

    public function test_a_user_sees_only_their_own_organisations_records(): void
    {
        $this->seedVessels();

        $response = $this->actingAsApi($this->alphaUser)->getJson('/api/vessels')->assertOk();

        $names = collect($response->json('data'))->pluck('name');

        $this->assertContains('Alpha Vessel', $names);
        $this->assertNotContains('Beta Vessel', $names);
    }

    /** The path that matters: a known id from another tenant. */
    public function test_a_record_belonging_to_another_organisation_is_not_reachable(): void
    {
        $this->seedVessels();

        $betaVessel = $this->within($this->beta, fn () => Vessel::firstWhere('code', 'B1'));

        $this->actingAsApi($this->alphaUser)
            ->getJson('/api/vessels/'.$betaVessel->id)
            ->assertNotFound();
    }

    public function test_another_organisations_record_cannot_be_updated(): void
    {
        $this->seedVessels();

        $betaVessel = $this->within($this->beta, fn () => Vessel::firstWhere('code', 'B1'));

        $this->actingAsApi($this->alphaUser)
            ->putJson('/api/vessels/'.$betaVessel->id, ['code' => 'B1', 'name' => 'Hijacked'])
            ->assertNotFound();

        $this->assertSame('Beta Vessel', $this->within($this->beta, fn () => $betaVessel->fresh()->name));
    }

    public function test_a_created_record_belongs_to_the_callers_organisation(): void
    {
        $this->actingAsApi($this->alphaUser)
            ->postJson('/api/ship-types', ['code' => 'TUG', 'name' => 'Harbour Tug'])
            ->assertCreated();

        $created = $this->within($this->alpha, fn () => ShipType::firstWhere('code', 'TUG'));

        $this->assertSame($this->alpha->id, $created->organisation_id);
        $this->assertNull($this->within($this->beta, fn () => ShipType::firstWhere('code', 'TUG')));
    }

    /** organisation_id in the payload must not move a record between tenants. */
    public function test_the_organisation_cannot_be_set_from_the_request(): void
    {
        $this->actingAsApi($this->alphaUser)
            ->postJson('/api/ship-types', [
                'code' => 'TUG',
                'name' => 'Harbour Tug',
                'organisation_id' => $this->beta->id,
            ])
            ->assertCreated();

        $created = $this->within($this->alpha, fn () => ShipType::firstWhere('code', 'TUG'));

        $this->assertSame($this->alpha->id, $created->organisation_id);
    }

    public function test_a_user_of_a_suspended_organisation_is_refused(): void
    {
        $this->beta->update(['status' => Organisation::STATUS_SUSPENDED]);

        $this->actingAsApi($this->betaUser)->getJson('/api/vessels')->assertForbidden();
    }

    /** A platform admin gets nothing until they name an organisation. */
    public function test_a_platform_admin_must_name_the_organisation(): void
    {
        $this->seedVessels();

        $admin = new User([
            'name' => 'Platform Admin',
            'email' => 'admin@platform.local',
            'password' => 'secret-password',
        ]);
		
		// Deliberately not mass-assignable: a platform admin flag that could be
        // set from request data would be a privilege escalation route.
        $admin->forceFill(['is_platform_admin' => true])->save();

        // No header: the scope has no context and refuses to guess.
        $this->actingAsApi($admin)->getJson('/api/vessels')->assertStatus(500);

        $this->actingAsApi($admin)
            ->withHeader('X-Organisation-Id', (string) $this->beta->id)
            ->getJson('/api/vessels')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Beta Vessel']);
    }
}
