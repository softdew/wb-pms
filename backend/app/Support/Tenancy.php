<?php

namespace App\Support;

use App\Models\Organisation;
use Closure;

/**
 * Holds the current organisation for the request or console process.
 *
 * Web requests resolve this from the authenticated user. Console commands and
 * queued jobs have no user, so they must set it explicitly -- see runFor().
 */
class Tenancy
{
    protected ?int $organisationId = null;

    protected bool $unscoped = false;

    public function id(): ?int
    {
        return $this->organisationId;
    }

    public function check(): bool
    {
        return $this->organisationId !== null;
    }

    public function set(Organisation|int|null $organisation): void
    {
        $this->organisationId = $organisation instanceof Organisation
            ? $organisation->id
            : $organisation;
    }

    /**
     * True when the tenant filter should be skipped entirely: platform
     * administrators, and code explicitly wrapped in unscoped().
     */
    public function isUnscoped(): bool
    {
        return $this->unscoped;
    }

    /**
     * Run a callback with the tenant filter disabled. Read-only use only --
     * writes made in here will not have an organisation_id filled in.
     */
    public function unscoped(Closure $callback): mixed
    {
        $previous = $this->unscoped;
        $this->unscoped = true;

        try {
            return $callback();
        } finally {
            $this->unscoped = $previous;
        }
    }

    /**
     * Run a callback in the context of one organisation, then restore whatever
     * was set before. This is how scheduled commands iterate tenants.
     */
    public function runFor(Organisation|int $organisation, Closure $callback): mixed
    {
        $previous = $this->organisationId;
        $previousUnscoped = $this->unscoped;

        $this->set($organisation);
        $this->unscoped = false;

        try {
            return $callback();
        } finally {
            $this->organisationId = $previous;
            $this->unscoped = $previousUnscoped;
        }
    }

    /**
     * Run a callback once per active organisation.
     */
    public function eachOrganisation(Closure $callback): void
    {
        $organisations = $this->unscoped(
            fn () => Organisation::query()
                ->where('status', Organisation::STATUS_ACTIVE)
                ->orderBy('id')
                ->get()
        );

        foreach ($organisations as $organisation) {
            $this->runFor($organisation, fn () => $callback($organisation));
        }
    }
}
