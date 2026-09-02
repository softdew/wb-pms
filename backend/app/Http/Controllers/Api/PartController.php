<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\MaintenanceRuleException;
use App\Models\Operator;
use App\Models\Part;
use App\Models\PartStock;
use App\Services\StockService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The department's parts catalogue. Quantities are not here -- spares are on
 * the contractor's account, so each operator's holding lives in part_stocks.
 */
class PartController extends CrudController
{
    protected array $with = ['category'];

    protected array $searchable = ['code', 'name', 'oem_reference'];

    public function __construct(protected StockService $stock)
    {
    }

    protected function model(): string
    {
        return Part::class;
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'code' => ['required', 'string', 'max:64'],
            'name' => ['required', 'string', 'max:255'],
            'part_category_id' => ['nullable', 'integer', 'exists:part_categories,id'],
            'oem_reference' => ['nullable', 'string', 'max:128'],
            'uom' => ['required', 'string', 'max:16'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'lead_time_days' => ['integer', 'min:0', 'max:3650'],
            'remarks' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }

    protected function applyFilters(Request $request, Builder $query): void
    {
        if ($category = $request->integer('part_category_id')) {
            $query->where('part_category_id', $category);
        }
    }

    /**
     * Holdings for one part. An operator sees only its own; the department
     * sees every operator's, which is what it asked for.
     */
    public function stocks(Request $request, int $id): JsonResponse
    {
        $part = Part::findOrFail($id);

        $stocks = PartStock::query()
            ->where('part_id', $part->id)
            ->when($request->user()->operator_id, fn ($q, $operatorId) => $q->where('operator_id', $operatorId))
            ->with(['operator:id,code,name', 'location:id,code,name'])
            ->get();

        return $this->ok([
            'part' => $part,
            'stocks' => $stocks,
            'total' => (float) $stocks->sum('stock_qty'),
        ]);
    }

    /** Set the reorder level and storage location for one operator's holding. */
    public function setStockPolicy(Request $request, int $id): JsonResponse
    {
        $part = Part::findOrFail($id);
        $operator = $this->resolveOperator($request);

        $data = $request->validate([
            'reorder_level' => ['nullable', 'numeric', 'min:0'],
            'location_id' => ['nullable', 'integer', 'exists:locations,id'],
            'remarks' => ['nullable', 'string'],
        ]);

        $stock = $this->stock->stockFor($part, $operator);
        $stock->update($data);

        return $this->ok($stock->fresh(['operator:id,code,name', 'location:id,code,name']));
    }

    /**
     * Stock never moves by direct edit. Every change is a ledger entry against
     * one operator's holding, so the balance can always be rebuilt from it.
     */
    public function movement(Request $request, int $id): JsonResponse
    {
        $part = Part::findOrFail($id);
        $operator = $this->resolveOperator($request);

        $data = $request->validate([
            'type' => ['required', 'in:receipt,issue,return,adjustment'],
            'quantity' => ['required', 'numeric'],
            'operator_id' => ['nullable', 'integer', 'exists:operators,id'],
            'reference_no' => ['nullable', 'string', 'max:64'],
            'remarks' => ['required_if:type,adjustment', 'nullable', 'string'],
        ]);

        $options = [
            'reference_no' => $data['reference_no'] ?? null,
            'recorded_by' => $request->user()->id,
            'remarks' => $data['remarks'] ?? null,
        ];

        $quantity = (float) $data['quantity'];

        $transaction = match ($data['type']) {
            'receipt' => $this->stock->receive($part, $operator, $quantity, $options),
            'issue' => $this->stock->issue($part, $operator, $quantity, $options),
            'return' => $this->stock->returnToStock($part, $operator, $quantity, $options),
            'adjustment' => $this->stock->adjust($part, $operator, $quantity, $data['remarks'], $options),
        };

        return $this->ok([
            'transaction' => $transaction,
            'stock' => $this->stock->stockFor($part, $operator)->fresh(),
        ], 201);
    }

    /** Holdings that have fallen to their reorder level. */
    public function belowReorderLevel(Request $request): JsonResponse
    {
        $operator = $request->user()->operator_id
            ? Operator::findOrFail($request->user()->operator_id)
            : null;

        return $this->ok($this->stock->belowReorderLevel($operator));
    }

    /**
     * An operator moves its own stock. A department user must say whose stock
     * is moving -- there is no shared pool to fall back on.
     */
    protected function resolveOperator(Request $request): Operator
    {
        if ($request->user()->operator_id) {
            return Operator::findOrFail($request->user()->operator_id);
        }

        $operatorId = $request->integer('operator_id');

        if (! $operatorId) {
            throw new MaintenanceRuleException(
                'Name the operator whose stock is moving. Spares are held per operating company, so there is no central stock to draw from.'
            );
        }

        return Operator::findOrFail($operatorId);
    }
}