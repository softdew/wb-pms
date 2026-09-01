<?php

namespace Tests\Feature\Tenancy;

use App\Models\Location;
use App\Models\Organisation;
use App\Models\Part;
use App\Models\ShipType;
use App\Models\Trade;
use App\Models\Vendor;
use App\Support\Tenancy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

/**
 * The isolation guarantee.
 *
 * If any of these fail, one operator can see another operator's fleet. Nothing
 * else in the system matters more than this, so these run against real models
 * and a real database rather than mocks.
 */
class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected Organisation $alpha;

    protected Organisation $beta;

    protected Tenancy $tenancy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenancy = app(Tenancy::class);

        $this->alpha = Organisation::create(['code' => 'ALPHA', 'name' => 'Alpha Ferries']);
        $this->beta = Organisation::create(['code' => 'BETA', 'name' => 'Beta Boats']);
    }

    /** A query with no tenant context must fail, not return everything. */
    public function test_querying_without_a_tenant_context_throws(): void
    {
        $this->tenancy->set(null);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('No organisation context set');

        Trade::count();
    }

    /** The context is what decides which rows exist. */
    public function test_a_tenant_sees_only_its_own_records(): void
    {
        $this->tenancy->runFor($this->alpha, function () {
            Trade::create(['code' => 'ENGR', 'name' => 'Alpha Engineer']);
            Trade::create(['code' => 'FITT', 'name' => 'Alpha Fitter']);
        });

        $this->tenancy->runFor($this->beta, function () {
            Trade::create(['code' => 'ENGR', 'name' => 'Beta Engineer']);
        });

        $this->tenancy->runFor($this->alpha, function () {
            $this->assertSame(2, Trade::count());
            $this->assertEqualsCanonicalizing(
                ['Alpha Engineer', 'Alpha Fitter'],
                Trade::pluck('name')->all()
            );
        });

        $this->tenancy->runFor($this->beta, function () {
            $this->assertSame(1, Trade::count());
            $this->assertSame('Beta Engineer', Trade::first()->name);
        });
    }

    /** organisation_id is filled from context, not from the caller. */
    public function test_organisation_id_is_stamped_on_create(): void
    {
        $trade = $this->tenancy->runFor(
            $this->beta,
            fn () => Trade::create(['code' => 'ELEC', 'name' => 'Electrician'])
        );

        $this->assertSame($this->beta->id, $trade->organisation_id);
    }

    /**
     * organisation_id is not fillable, so an attempt to mass-assign another
     * tenant's id is dropped and the creating hook stamps the correct one.
     * Mass assignment cannot cross tenants at all.
     */
    public function test_organisation_id_cannot_be_mass_assigned_to_another_tenant(): void
    {
        $trade = $this->tenancy->runFor($this->alpha, fn () => Trade::create([
            'code' => 'SNEAK',
            'name' => 'Attempted crossing',
            'organisation_id' => $this->beta->id,
        ]));

        $this->assertSame($this->alpha->id, $trade->organisation_id);

        $this->tenancy->runFor($this->alpha, fn () => $this->assertSame(1, Trade::count()));
        $this->tenancy->runFor($this->beta, fn () => $this->assertSame(0, Trade::count()));
    }

    /**
     * Setting the attribute directly bypasses $fillable. The row is written
     * where asked, but the scope makes it invisible to the tenant that created
     * it, so the mistake surfaces immediately rather than silently.
     */
    public function test_a_row_written_with_another_tenants_id_is_invisible_here(): void
    {
        $this->tenancy->runFor($this->alpha, function () {
            $trade = new Trade(['code' => 'SNEAK', 'name' => 'Forced across']);
            $trade->organisation_id = $this->beta->id;
            $trade->save();

            $this->assertSame(0, Trade::count());
        });

        $this->tenancy->runFor($this->beta, fn () => $this->assertSame(1, Trade::count()));
    }

    /** find() must not reach across tenants either. */
    public function test_find_cannot_reach_another_tenants_row(): void
    {
        $alphaTrade = $this->tenancy->runFor(
            $this->alpha,
            fn () => Trade::create(['code' => 'WELD', 'name' => 'Welder'])
        );

        $this->tenancy->runFor($this->beta, function () use ($alphaTrade) {
            $this->assertNull(Trade::find($alphaTrade->id));
        });
    }

    /** Neither may update or delete. */
    public function test_update_and_delete_cannot_cross_tenants(): void
    {
        $alphaTrade = $this->tenancy->runFor(
            $this->alpha,
            fn () => Trade::create(['code' => 'PAIN', 'name' => 'Painter'])
        );

        $this->tenancy->runFor($this->beta, function () use ($alphaTrade) {
            $this->assertSame(0, Trade::whereKey($alphaTrade->id)->update(['name' => 'Hijacked']));
            $this->assertSame(0, Trade::whereKey($alphaTrade->id)->delete());
        });

        $this->tenancy->runFor($this->alpha, function () use ($alphaTrade) {
            $this->assertSame('Painter', $alphaTrade->fresh()->name);
        });
    }

    /** Aggregates and exists() go through the same scope. */
    public function test_aggregates_are_scoped(): void
    {
        $this->tenancy->runFor($this->alpha, fn () => Part::create([
            'code' => 'P-1', 'name' => 'Alpha part', 'unit_cost' => 100, 'stock_qty' => 5,
        ]));

        $this->tenancy->runFor($this->beta, fn () => Part::create([
            'code' => 'P-1', 'name' => 'Beta part', 'unit_cost' => 900, 'stock_qty' => 3,
        ]));

        $this->tenancy->runFor($this->alpha, function () {
            $this->assertSame(1, Part::count());
            $this->assertEquals(100, Part::sum('unit_cost'));
            $this->assertTrue(Part::where('name', 'Alpha part')->exists());
            $this->assertFalse(Part::where('name', 'Beta part')->exists());
        });
    }

    /** The same business code is valid in two organisations at once. */
    public function test_codes_are_unique_per_organisation_not_globally(): void
    {
        $this->tenancy->runFor($this->alpha, fn () => ShipType::create(['code' => 'FERRY', 'name' => 'Alpha ferry']));
        $this->tenancy->runFor($this->beta, fn () => ShipType::create(['code' => 'FERRY', 'name' => 'Beta ferry']));

        $this->assertSame(2, ShipType::withoutGlobalScopes()->where('code', 'FERRY')->count());
    }

    /** Relations must not become a side door into another tenant's data. */
    public function test_relations_do_not_leak_across_tenants(): void
    {
        [$alphaVendor, $betaVendor] = [
            $this->tenancy->runFor($this->alpha, fn () => Vendor::create(['code' => 'V1', 'name' => 'Alpha Vendor'])),
            $this->tenancy->runFor($this->beta, fn () => Vendor::create(['code' => 'V1', 'name' => 'Beta Vendor'])),
        ];

        $this->tenancy->runFor($this->alpha, function () use ($alphaVendor) {
            $alphaVendor->serviceRates()->create([
                'activity' => 'Engine overhaul', 'unit' => 'per engine',
                'rate' => 50000, 'valid_from' => now()->toDateString(),
            ]);
        });

        $this->tenancy->runFor($this->beta, function () use ($betaVendor, $alphaVendor) {
            $this->assertSame(0, $betaVendor->serviceRates()->count());
            $this->assertSame(0, $alphaVendor->serviceRates()->count());
        });
    }

    /**
     * eachOrganisation() is how scheduled work iterates tenants. Each pass must
     * see only its own rows, and the context must be restored afterwards.
     */
    public function test_each_organisation_scopes_every_pass(): void
    {
        $this->tenancy->runFor($this->alpha, fn () => Location::create(['code' => 'G1', 'name' => 'Alpha Ghat']));
        $this->tenancy->runFor($this->beta, function () {
            Location::create(['code' => 'G1', 'name' => 'Beta Ghat A']);
            Location::create(['code' => 'G2', 'name' => 'Beta Ghat B']);
        });

        $seen = [];

        $this->tenancy->set($this->alpha);
        $this->tenancy->eachOrganisation(function (Organisation $org) use (&$seen) {
            $seen[$org->code] = Location::count();
        });

        $this->assertSame(['ALPHA' => 1, 'BETA' => 2], $seen);
        $this->assertSame($this->alpha->id, $this->tenancy->id(), 'Context must be restored after iteration.');
    }

    /** Suspended organisations are skipped by scheduled work. */
    public function test_each_organisation_skips_suspended_tenants(): void
    {
        $this->beta->update(['status' => Organisation::STATUS_SUSPENDED]);

        $seen = [];
        $this->tenancy->eachOrganisation(function (Organisation $org) use (&$seen) {
            $seen[] = $org->code;
        });

        $this->assertSame(['ALPHA'], $seen);
    }

    /** unscoped() is the deliberate escape hatch, and it must not persist. */
    public function test_unscoped_reads_across_tenants_then_restores(): void
    {
        $this->tenancy->runFor($this->alpha, fn () => Trade::create(['code' => 'A', 'name' => 'Alpha']));
        $this->tenancy->runFor($this->beta, fn () => Trade::create(['code' => 'B', 'name' => 'Beta']));

        $this->tenancy->runFor($this->alpha, function () {
            $this->assertSame(1, Trade::count());

            $all = $this->tenancy->unscoped(fn () => Trade::count());
            $this->assertSame(2, $all);

            $this->assertSame(1, Trade::count(), 'Scope must be reinstated after unscoped().');
        });
    }

    /** Organisation itself is never scoped -- it is how context is established. */
    public function test_organisation_model_is_not_scoped(): void
    {
        $this->tenancy->set(null);

        $this->assertSame(2, Organisation::count());
    }
}
