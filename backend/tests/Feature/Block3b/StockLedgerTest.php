<?php

namespace Tests\Feature\Block3b;

use App\Enums\StockTransactionType;
use App\Exceptions\MaintenanceRuleException;
use App\Models\StockTransaction;
use App\Services\StockService;

class StockLedgerTest extends Block3bTestCase
{
    protected StockService $stock;

    protected function setUp(): void
    {
        parent::setUp();
        $this->stock = app(StockService::class);
    }

    public function test_a_receipt_raises_the_balance_and_records_it(): void
    {
        $part = $this->makePart();

        $txn = $this->stock->receive($part, 20, ['reference_no' => 'GRN-001']);

        $this->assertEquals(20, $part->refresh()->stock_qty);
        $this->assertEquals(20, $txn->balance_after);
        $this->assertSame(StockTransactionType::Receipt, $txn->type);
    }

    public function test_an_issue_lowers_the_balance(): void
    {
        $part = $this->makePart();
        $this->stock->receive($part, 20);
        $this->stock->issue($part->refresh(), 5);

        $this->assertEquals(15, $part->refresh()->stock_qty);
    }

    public function test_stock_cannot_be_issued_below_zero(): void
    {
        $part = $this->makePart();
        $this->stock->receive($part, 3);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('only 3 in stock');

        $this->stock->issue($part->refresh(), 5);
    }

    public function test_a_return_puts_stock_back(): void
    {
        $part = $this->makePart();
        $this->stock->receive($part, 10);
        $this->stock->issue($part->refresh(), 4);
        $this->stock->returnToStock($part->refresh(), 1);

        $this->assertEquals(7, $part->refresh()->stock_qty);
    }

    public function test_an_adjustment_carries_its_reason(): void
    {
        $part = $this->makePart();
        $this->stock->receive($part, 10);

        $txn = $this->stock->adjust($part->refresh(), -2, 'Physical count variance');

        $this->assertEquals(8, $part->refresh()->stock_qty);
        $this->assertSame('Physical count variance', $txn->remarks);
    }

    /** The whole point of a ledger: the balance can be rebuilt from it. */
    public function test_the_balance_can_be_rebuilt_from_the_ledger(): void
    {
        $part = $this->makePart();
        $this->stock->receive($part, 50);
        $this->stock->issue($part->refresh(), 12);
        $this->stock->issue($part->refresh(), 8);
        $this->stock->returnToStock($part->refresh(), 3);

        // Corrupt the cached figure, then rebuild it.
        $part->forceFill(['stock_qty' => 999])->save();

        $this->assertSame(33.0, $this->stock->rebuildBalance($part->refresh()));
        $this->assertEquals(33, $part->refresh()->stock_qty);
        $this->assertSame(4, StockTransaction::where('part_id', $part->id)->count());
    }

    public function test_parts_below_reorder_level_are_listed(): void
    {
        $low = $this->makePart(['code' => 'LOW-1', 'reorder_level' => 10]);
        $fine = $this->makePart(['code' => 'OK-1', 'reorder_level' => 5]);

        $this->stock->receive($low, 8);
        $this->stock->receive($fine, 40);

        $below = $this->stock->belowReorderLevel();

        $this->assertCount(1, $below);
        $this->assertSame('LOW-1', $below->first()->code);
    }

    public function test_transactions_are_scoped_to_the_organisation(): void
    {
        $part = $this->makePart();
        $this->stock->receive($part, 5);

        $this->assertSame($this->org->id, StockTransaction::first()->organisation_id);
    }
}
