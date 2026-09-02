<?php

namespace App\Http\Controllers\Api;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Shared CRUD for the master tables. Everything it returns is already scoped by
 * the global tenant scope, so no controller here filters by organisation.
 */
abstract class CrudController extends ApiController
{
    /** @return class-string<Model> */
    abstract protected function model(): string;

    /** @return array<string,mixed> */
    abstract protected function rules(Request $request, ?Model $record = null): array;

    /** Columns matched by the ?search= parameter. */
    protected array $searchable = ['code', 'name'];

    protected array $with = [];

    protected string $orderBy = 'code';

    public function index(Request $request): JsonResponse
    {
        $query = $this->model()::query()->with($this->with);

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function (Builder $q) use ($search) {
                foreach ($this->searchable as $column) {
                    $q->orWhere($column, 'ilike', '%'.$search.'%');
                }
            });
        }

        $this->applyFilters($request, $query);

        return $this->ok(
            $query->orderBy($this->orderBy)
                ->paginate(min($request->integer('per_page', 25), 100))
                ->withQueryString()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $record = $this->model()::create($request->validate($this->rules($request)));

        return $this->ok($record->load($this->with), 201);
    }

    public function show(int $id): JsonResponse
    {
        return $this->ok($this->model()::with($this->with)->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate($this->rules($request));

        $record = $this->model()::findOrFail($id);
        $record->update($validated);

        return $this->ok($record->load($this->with));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->model()::findOrFail($id)->delete();

        return $this->message('Deleted.');
    }

    protected function applyFilters(Request $request, Builder $query): void
    {
        //
    }

    /** Unique rule scoped to the organisation, ignoring the record being edited. */
    protected function uniqueInOrganisation(string $table, string $column, ?Model $record): string
    {
        $rule = 'unique:'.$table.','.$column;

        return $record ? $rule.','.$record->getKey() : $rule;
    }
}
