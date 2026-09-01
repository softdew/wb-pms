<?php

namespace App\Models\Scopes;

use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use RuntimeException;

class OrganisationScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenancy = app(Tenancy::class);

        if ($tenancy->isUnscoped()) {
            return;
        }

        if (! $tenancy->check()) {
            // Failing loudly is deliberate. A query with no tenant context is a
            // bug, and silently returning every organisation's rows is the one
            // failure mode this system cannot have.
            throw new RuntimeException(sprintf(
                'No organisation context set while querying [%s]. Wrap console and queued work in Tenancy::runFor().',
                $model::class
            ));
        }

        $builder->where(
            $model->qualifyColumn('organisation_id'),
            $tenancy->id()
        );
    }
}
