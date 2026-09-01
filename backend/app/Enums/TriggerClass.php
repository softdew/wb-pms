<?php

namespace App\Enums;

enum TriggerClass: string
{
    /** Elapsed time since last completion. Due date computed automatically. */
    case Calendar = 'calendar';

    /** Running hours, cycles or sailings against the asset's meter. */
    case Meter = 'meter';

    /** A measured parameter crossing a configured limit. */
    case Condition = 'condition';

    /** A defined operational occurrence -- grounding, overheat, heavy weather. */
    case Event = 'event';

    /** A regulatory or class survey date, with an outer limit on extension. */
    case Statutory = 'statutory';

    /** Whether the system can compute a due point without human input. */
    public function isAutomatic(): bool
    {
        return in_array($this, [self::Calendar, self::Meter, self::Statutory], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::Calendar => 'Calendar',
            self::Meter => 'Meter / usage',
            self::Condition => 'Condition threshold',
            self::Event => 'Event',
            self::Statutory => 'Statutory survey',
        };
    }
}
