<?php

namespace App\Services;

use App\Enums\StockTransactionType;
use App\Exceptions\MaintenanceRuleException;
use App\Models\Part;
use App\Models\StockTransaction;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Every movement of stock is a ledger row. parts.stock_qty is a cached running
 * figure written only from here, so it can always be rebuilt from the ledger.
 */
class StockService
{
    public function receive(Part $part, float $quantity, array $options = []): StockTransaction
    {
        $this->guardPositive($quantity);

        return $this->post($part, StockTransactionType::Receipt, $quantity, $options);
    }

    public function issue(Part $part, float $quantity, array $options = []): StockTransaction
    {
        $this->guardPositive($quantity);

        if ((float) $part->stock_qty < $quantity && ! ($options['allow_negative'] ?? false)) {
            throw new MaintenanceRuleException(sprintf(
                'Cannot issue %s of %s: only %s in stock.',
                rtrim(rtrim(number_format($quantity, 3), '0'), '.'),
                $part->code,
                rtrim(rtrim(number_format((float) $part->stock_qty, 3), '0'), '.'),
            ));
        }

        return $this->post($part, StockTransactionType::Issue, -$quantity, $options);
    }

    public function returnToStock(Part $part, float $quantity, array $options = []): StockTransaction
    {
        $this->guardPositive($quantity);

        return $this->post($part, StockTransactionType::Return, $quantity, $options);
    }

    /** Signed correction from a physical count. */
    public function adjust(Part $part, float $signedQuantity, string $reason, array $options = []): StockTransaction
    {
        if ($signedQuantity == 0.0) {
            throw new MaintenanceRuleException('An adjustment of zero has nothing to record.');
        }

        return $this->post($part, StockTransactionType::Adjustment, $signedQuantity, [
            'remarks' => $reason,
        ] + $options);
    }

    /** Issue everything a work order planned, in one transaction. */
    public function issueForWorkOrder(WorkOrder $workOrder, ?User $user = null): int
    {
        return DB::transaction(function () use ($workOrder, $user) {
            $issued = 0;

            foreach ($workOrder->parts as $line) {
                $quantity = (float) ($line->actual_quantity ?? $line->planned_quantity);

                if ($quantity <= 0) {
                    continue;
                }

                $this->issue($line->part, $quantity, [
                    'work_order_id' => $workOrder->id,
                    'recorded_by' => $user?->id,
                    'reference_no' => $workOrder->number,
                ]);

                $line->update(['actual_quantity' => $quantity]);
                $issued++;
            }

            return $issued;
        });
    }

    /** Parts at or below their reorder level. */
    public function belowReorderLevel()
    {
        return Part::query()
            ->whereNotNull('reorder_level')
            ->whereColumn('stock_qty', '<=', 'reorder_level')
            ->orderBy('code')
            ->get();
    }

    /** Recompute a part's running figure from the ledger. */
    public function rebuildBalance(Part $part): float
    {
        $balance = (float) StockTransaction::where('part_id', $part->id)->sum('quantity');

        $part->forceFill(['stock_qty' => $balance])->save();

        return $balance;
    }

    protected function post(Part $part, StockTransactionType $type, float $signedQuantity, array $options): StockTransaction
    {
        return DB::transaction(function () use ($part, $type, $signedQuantity, $options) {
            // Lock the row so two concurrent issues cannot both read the same
            // balance and oversell the same stock.
            $locked = Part::whereKey($part->id)->lockForUpdate()->first();

            $balance = round((float) $locked->stock_qty + $signedQuantity, 3);

            $transaction = StockTransaction::create([
                'part_id' => $locked->id,
                'work_order_id' => $options['work_order_id'] ?? null,
                'location_id' => $options['location_id'] ?? $locked->location_id,
                'type' => $type,
                'quantity' => $signedQuantity,
                'balance_after' => $balance,
                'unit_cost' => $options['unit_cost'] ?? $locked->unit_cost,
                'reference_no' => $options['reference_no'] ?? null,
                'transacted_on' => ($options['transacted_on'] ?? Carbon::now())->toDateString(),
                'recorded_by' => $options['recorded_by'] ?? null,
                'remarks' => $options['remarks'] ?? null,
            ]);

            $locked->forceFill(['stock_qty' => $balance])->save();
            $part->refresh();

            return $transaction;
        });
    }

    protected function guardPositive(float $quantity): void
    {
        if ($quantity <= 0) {
            throw new MaintenanceRuleException('Quantity must be greater than zero.');
        }
    }
}
