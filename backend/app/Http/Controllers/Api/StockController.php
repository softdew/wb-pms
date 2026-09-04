<?php

namespace App\Http\Controllers\Api;

use App\Models\Operator;
use App\Models\Part;
use App\Models\PartStock;
use App\Models\StockTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Stock, held per operator.
 *
 * Spares are on the contractor's account, so there is no shared balance. The
 * department reads across every operator; an operator reads only its own.
 */
class StockController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $ownOperatorId = $request->user()->operator_id;

        $operators = Operator::query()
            ->active()
            ->when($ownOperatorId, fn ($q) => $q->whereKey($ownOperatorId))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'type']);

        $stocks = PartStock::query()
            ->when($ownOperatorId, fn ($q) => $q->where('operator_id', $ownOperatorId))
            ->with(['part:id,code,name,uom,lead_time_days,part_category_id', 'part.category:id,code,name'])
            ->get();

        // One row per catalogue part, with a column per operator. That grid is
        // the only place the department can see who is holding what.
        $rows = $stocks
            ->groupBy('part_id')
            ->map(function ($holdings) {
                $part = $holdings->first()->part;

                return [
                    'part' => [
                        'id' => $part->id,
                        'code' => $part->code,
                        'name' => $part->name,
                        'uom' => $part->uom,
                        'lead_time_days' => $part->lead_time_days,
                        'category' => $part->category?->only(['id', 'code', 'name']),
                    ],
                    'holdings' => $holdings->map(fn (PartStock $stock) => [
                        'operator_id' => $stock->operator_id,
                        'stock_qty' => (float) $stock->stock_qty,
                        'reorder_level' => $stock->reorder_level !== null
                            ? (float) $stock->reorder_level
                            : null,
                        'below' => $stock->isBelowReorderLevel(),
                    ])->values(),
                    'total' => (float) $holdings->sum('stock_qty'),
                    'short' => $holdings->filter(fn (PartStock $s) => $s->isBelowReorderLevel())->count(),
                ];
            })
            ->sortBy(fn ($row) => $row['part']['name'])
            ->values();

        return $this->ok([
            'operators' => $operators,
            'rows' => $rows,
            'own_operator_id' => $ownOperatorId,
            'totals' => [
                'lines' => $rows->count(),
                'below_reorder' => $stocks->filter(fn (PartStock $s) => $s->isBelowReorderLevel())->count(),
            ],
        ]);
    }

    /** One part's holdings and its recent movements. */
    public function show(Request $request, int $partId): JsonResponse
    {
        $part = Part::with('category:id,code,name')->findOrFail($partId);
        $ownOperatorId = $request->user()->operator_id;

        return $this->ok([
            'part' => $part,
            'holdings' => PartStock::query()
                ->where('part_id', $part->id)
                ->when($ownOperatorId, fn ($q) => $q->where('operator_id', $ownOperatorId))
                ->with(['operator:id,code,name', 'location:id,code,name'])
                ->get(),
            'movements' => StockTransaction::query()
                ->where('part_id', $part->id)
                ->when($ownOperatorId, fn ($q) => $q->where('operator_id', $ownOperatorId))
                ->with(['operator:id,code,name', 'recordedBy:id,name', 'workOrder:id,number'])
                ->orderByDesc('id')
                ->limit(50)
                ->get(),
            'operators' => Operator::query()
                ->active()
                ->when($ownOperatorId, fn ($q) => $q->whereKey($ownOperatorId))
                ->orderBy('name')
                ->get(['id', 'code', 'name']),
        ]);
    }
}
