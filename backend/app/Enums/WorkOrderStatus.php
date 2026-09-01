<?php

namespace App\Enums;

enum WorkOrderStatus: string
{
    case Draft = 'draft';
    case Released = 'released';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Closed = 'closed';
    case Cancelled = 'cancelled';

    public function isOpen(): bool
    {
        return in_array($this, [self::Draft, self::Released, self::InProgress], true);
    }

    /** Which statuses may follow this one. */
    public function allows(self $next): bool
    {
        return in_array($next, match ($this) {
            self::Draft => [self::Released, self::Cancelled],
            self::Released => [self::InProgress, self::Completed, self::Cancelled],
            self::InProgress => [self::Completed, self::Cancelled],
            self::Completed => [self::Closed],
            self::Closed, self::Cancelled => [],
        }, true);
    }
}
