<?php

namespace App\Models\Concerns;

use App\Models\Scopes\OperatorScope;

/**
 * Applied to vessel-derived data.
 *
 * A model using this must define operatorRelationPath(), naming the relation
 * chain that reaches a vessel -- or operatorColumn() if it holds operator_id
 * directly.
 */
trait ScopedToOperator
{
    public static function bootScopedToOperator(): void
    {
        static::addGlobalScope(new OperatorScope);
    }

    /** Relation path from this model to the vessel, for the scope's whereHas. */
    public function operatorRelationPath(): string
    {
        return 'vessel';
    }
}
