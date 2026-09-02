<?php

namespace App\Support;

use App\Models\Operator;
use Closure;

/**
 * Holds the operating company for the request, where there is one.
 *
 * Department users have no operator and see the whole fleet. Operator users --
 * the cooperative societies and private companies bidding against each other
 * for the same tenders -- see only the vessels currently assigned to them.
 *
 * Unlike Tenancy, an absent context here is normal rather than a bug: it means
 * a department user. So this scope filters when set and stands aside when not.
 * The safety comes from the fact that only a user record can set it.
 */
class OperatorContext
{
    protected ?int $operatorId = null;

    protected bool $unscoped = false;

    public function id(): ?int
    {
        return $this->operatorId;
    }

    public function check(): bool
    {
        return $this->operatorId !== null;
    }

    public function set(Operator|int|null $operator): void
    {
        $this->operatorId = $operator instanceof Operator ? $operator->id : $operator;
    }

    public function isUnscoped(): bool
    {
        return $this->unscoped;
    }

    /**
     * Ignore the operator filter for a block of work. Used by the department's
     * own reporting and by scheduled commands, which run for the whole fleet.
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

    /** Run a callback as one operator. */
    public function runFor(Operator|int|null $operator, Closure $callback): mixed
    {
        $previousId = $this->operatorId;
        $previousUnscoped = $this->unscoped;

        $this->set($operator);
        $this->unscoped = false;

        try {
            return $callback();
        } finally {
            $this->operatorId = $previousId;
            $this->unscoped = $previousUnscoped;
        }
    }
}
