<?php

namespace App\Models\Scopes;

use App\Support\OperatorContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Restricts a model to the vessels of the operator in context.
 *
 * The model tells the scope how to reach the operator, since vessels carry the
 * column directly while equipment, plans and work orders reach it through a
 * relationship.
 */
class OperatorScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $context = app(OperatorContext::class);

        if ($context->isUnscoped() || ! $context->check()) {
            return; // department user, or deliberately unscoped work
        }

        $operatorId = $context->id();

        // A model either carries operator_id itself or names the relationship
        // path that leads to a vessel.
        if (method_exists($model, 'operatorColumn')) {
            $builder->where($model->qualifyColumn($model->operatorColumn()), $operatorId);

            return;
        }

        $path = $model->operatorRelationPath();

        $builder->whereHas($path, function (Builder $query) use ($operatorId) {
            $query->where('vessels.operator_id', $operatorId);
        });
    }
}
