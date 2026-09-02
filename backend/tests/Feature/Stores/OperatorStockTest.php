<?php

namespace Tests\Feature\Stores;

use App\Exceptions\MaintenanceRuleException;
use App\Models\Operator;
use App\Models\Organisation;
use App\Models\Part;
use App\Models\PartStock;
use App\Models\StockTransaction;
use App\Services\StockService;
use App\Support\Tenancy;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Stock belongs to the operating company, not to the department.
 *
 * Spares are on the contractor's account, so two societies holding the same
 * catalogue part hold separate quantities, separate reorder levels and separate
 * ledgers.
 */
class OperatorStockTest extends TestCase
{
    use RefreshDatabase;

    protected StockService $stock;

    protected Operator $coopA;

    protected Operator $coopB;

    protected Part $filter;

    protected function setUp(): void
    {
        parent::setUp();

        $org = Organisation::create(['code' => 'WBTC', 'name' => 'WB Transport Corporation']);
        app(ReferenceDataSeeder::class)->run($org);
        app(Tenancy::class)->set($org);

        $this->stock = app(StockService::class);

        $this->coopA = Operator::create(['code' => 'COOPA', 'name' => 'Hooghly Society']);
        $this->coopB = Operator::create(['code' => 'COOPB', 'name' => 'Ganga Society']);

        $this->filter = Part::create([
            'code' => 'FLT-1040',
            'name' => 'Oil filter cartridge, R1040',
            'uom' => 'nos',
            'unit_cost' => 480,
            'lead_time_days' => 21,
        ]);
    }

    public function test_the_catalogue_holds_no_quantity(): void
    {
        $this->assertFalse(
            \Illuminate\Support\Facades\Schema::hasColumn('parts', 'stock_qty'),
            'Stock must live on part_stocks, not on the catalogue.'
        );
    }

    public function test_two_operators_hold_the_same_part_separately(): void
    {
        $this->stock->receive($this->filter, $this->coopA, 12);
        $this->stock->receive($this->filter, $this->coopB, 3);

        $this->assertEquals(12, $this->stock->stockFor($this->filter, $this->coopA)->stock_qty);
        $this->assertEquals(3, $this->stock->stockFor($this->filter, $this->coopB)->stock_qty);
        $this->assertSame(15.0, $this->filter->totalStock());
    }

    public function test_an_issue_only_touches_that_operators_holding(): void
    {
        $this->stock->receive($this->filter, $this->coopA, 12);
        $this->stock->receive($this->filter, $this->coopB, 3);

        $this->stock->issue($this->filter, $this->coopA, 5);

        $this->assertEquals(7, $this->stock->stockFor($this->filter, $this->coopA)->stock_qty);
        $this->assertEquals(3, $this->stock->stockFor($this->filter, $this->coopB)->stock_qty);
    }

    /** One society's shortage is not another's. */
    public function test_an_operator_cannot_issue_beyond_its_own_stock(): void
    {
        $this->stock->receive($this->filter, $this->coopA, 20);
        $this->stock->receive($this->filter, $this->coopB, 1);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('Ganga Society cannot issue 5');

        $this->stock->issue($this->filter, $this->coopB, 5);
    }

    public function test_reorder_levels_are_set_per_operator(): void
    {
        $this->stock->receive($this->filter, $this->coopA, 4);
        $this->stock->receive($this->filter, $this->coopB, 4);

        $this->stock->stockFor($this->filter, $this->coopA)->update(['reorder_level' => 10]);
        $this->stock->stockFor($this->filter, $this->coopB)->update(['reorder_level' => 2]);

        $below = $this->stock->belowReorderLevel();

        $this->assertCount(1, $below);
        $this->assertSame($this->coopA->id, $below->first()->operator_id);
    }

    public function test_each_operator_keeps_its_own_ledger(): void
    {
        $this->stock->receive($this->filter, $this->coopA, 10);
        $this->stock->issue($this->filter, $this->coopA, 4);
        $this->stock->receive($this->filter, $this->coopB, 6);

        $this->assertSame(2, StockTransaction::where('operator_id', $this->coopA->id)->count());
        $this->assertSame(1, StockTransaction::where('operator_id', $this->coopB->id)->count());
    }

    public function test_a_balance_rebuilds_from_that_operators_ledger(): void
    {
        $this->stock->receive($this->filter, $this->coopA, 50);
        $this->stock->issue($this->filter, $this->coopA, 12);
        $this->stock->returnToStock($this->filter, $this->coopA, 2);
        $this->stock->receive($this->filter, $this->coopB, 999);

        $this->stock->stockFor($this->filter, $this->coopA)->forceFill(['stock_qty' => 0])->save();

        $this->assertSame(40.0, $this->stock->rebuildBalance($this->filter, $this->coopA));
    }

    /** The department reads across everyone. */
    public function test_the_department_sees_every_operators_holding(): void
    {
        $this->stock->receive($this->filter, $this->coopA, 12);
        $this->stock->receive($this->filter, $this->coopB, 3);

        $this->assertSame(2, PartStock::where('part_id', $this->filter->id)->count());
        $this->assertSame(15.0, (float) PartStock::sum('stock_qty'));
    }

    public function test_an_adjustment_records_its_reason(): void
    {
        $this->stock->receive($this->filter, $this->coopA, 10);

        $txn = $this->stock->adjust($this->filter, $this->coopA, -2, 'Physical count variance');

        $this->assertEquals(8, $this->stock->stockFor($this->filter, $this->coopA)->stock_qty);
        $this->assertSame('Physical count variance', $txn->remarks);
    }
}
