<?php

namespace App\Services;

use App\Enums\StockTransactionType;
use App\Exceptions\MaintenanceRuleException;
use App\Models\Operator;
use App\Models\Part;
use App\Models\PartStock;
use App\Models\StockTransaction;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Stock movements, always against one operator's holding.
 *
 * Spares are on the contractor's account, so there is no shared balance: an
 * issue reduces that operator's stock and nobody else's. part_stocks.stock_qty
 * is a cached running figure written only from here, rebuildable from the
 * ledger at any time.
 */
class StockService
{
    public function receive(Part $part, Operator $operator, float $quantity, array $options = []): StockTransaction
    {
        $this->guardPositive($quantity);

        return $this->post($part, $operator, StockTransactionType::Receipt, $quantity, $options);
    }

    public function issue(Part $part, Operator $operator, float $quantity, array $options = []): StockTransaction
    {
        $this->guardPositive($quantity);

        $held = (float) $this->stockFor($part, $operator)->stock_qty;

        if ($held < $quantity && ! ($options['allow_negative'] ?? false)) {
            throw new MaintenanceRuleException(sprintf(
                '%s cannot issue %s of %s: only %s in stock.',
                $operator->name,
                $this->trim($quantity),
                $part->code,
                $this->trim($held),
            ));
        }

        return $this->post($part, $operator, StockTransactionType::Issue, -$quantity, $options);
    }

    public function returnToStock(Part $part, Operator $operator, float $quantity, array $options = []): StockTransaction
    {
        $this->guardPositive($quantity);

        return $this->post($part, $operator, StockTransactionType::Return, $quantity, $options);
    }

    public function adjust(Part $part, Operator $operator, float $signedQuantity, string $reason, array $options = []): StockTransaction
    {
        if ($signedQuantity == 0.0) {
            throw new MaintenanceRuleException('An adjustment of zero has nothing to record.');
        }

        return $this->post($part, $operator, StockTransactionType::Adjustment, $signedQuantity, [
            'remarks' => $reason,
        ] + $options);
    }

    /**
     * Issue everything a work order planned, from the stock of the operator
     * running the vessel.
     */
    public function issueForWorkOrder(WorkOrder $workOrder, ?User $user = null): int
    {
        $operator = $workOrder->equipment?->vessel?->operator;

        if (! $operator) {
            throw new MaintenanceRuleException(
                'This work order is on a vessel with no operator assigned, so there is no stock to issue from.'
            );
        }

        return DB::transaction(function () use ($workOrder, $operator, $user) {
            $issued = 0;

            foreach ($workOrder->parts as $line) {
                $quantity = (float) ($line->actual_quantity ?? $line->planned_quantity);

                if ($quantity <= 0) {
                    continue;
                }

                $this->issue($line->part, $operator, $quantity, [
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

    /** One operator's holdings that have fallen to their reorder level. */
    public function belowReorderLevel(?Operator $operator = null)
    {
        return PartStock::query()
            ->belowReorderLevel()
            ->when($operator, fn ($q) => $q->forOperator($operator))
            ->with(['part:id,code,name,lead_time_days', 'operator:id,code,name'])
            ->get();
    }

    /** Recompute one operator's balance for a part from the ledger. */
    public function rebuildBalance(Part $part, Operator $operator): float
    {
        $balance = (float) StockTransaction::query()
            ->where('part_id', $part->id)
            ->where('operator_id', $operator->id)
            ->sum('quantity');

        $this->stockFor($part, $operator)->forceFill(['stock_qty' => $balance])->save();

        return $balance;
    }

    /** The holding row, created empty on first use. */
    public function stockFor(Part $part, Operator $operator): PartStock
    {
        return PartStock::firstOrCreate(
            ['part_id' => $part->id, 'operator_id' => $operator->id],
            ['stock_qty' => 0],
        );
    }

    protected function post(Part $part, Operator $operator, StockTransactionType $type, float $signedQuantity, array $options): StockTransaction
    {
        return DB::transaction(function () use ($part, $operator, $type, $signedQuantity, $options) {
            $stock = $this->stockFor($part, $operator);

            // Lock the holding so two concurrent issues cannot read the same
            // balance and oversell it.
            $locked = PartStock::whereKey($stock->id)->lockForUpdate()->first();

            $balance = round((float) $locked->stock_qty + $signedQuantity, 3);

            $transaction = StockTransaction::create([
                'operator_id' => $operator->id,
                'part_id' => $part->id,
                'work_order_id' => $options['work_order_id'] ?? null,
                'location_id' => $options['location_id'] ?? $locked->location_id,
                'type' => $type,
                'quantity' => $signedQuantity,
                'balance_after' => $balance,
                'unit_cost' => $options['unit_cost'] ?? $part->unit_cost,
                'reference_no' => $options['reference_no'] ?? null,
                'transacted_on' => ($options['transacted_on'] ?? Carbon::now())->toDateString(),
                'recorded_by' => $options['recorded_by'] ?? null,
                'remarks' => $options['remarks'] ?? null,
            ]);

            $locked->forceFill(['stock_qty' => $balance])->save();

            return $transaction;
        });
    }

    protected function guardPositive(float $quantity): void
    {
        if ($quantity <= 0) {
            throw new MaintenanceRuleException('Quantity must be greater than zero.');
        }
    }

    protected function trim(float $value): string
    {
        return rtrim(rtrim(number_format($value, 3, '.', ''), '0'), '.');
    }
}
