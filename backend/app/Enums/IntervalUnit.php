<?php

namespace App\Enums;

use Illuminate\Support\Carbon;

/**
 * An interval is a value plus a unit. The client's sheets use both regimes --
 * "every 500 Hrs." on the Main Engine, "3 Monthly" on the Pumps -- so a single
 * numeric frequency cannot express their schedule.
 */
enum IntervalUnit: string
{
    case Hours = 'hours';
    case Days = 'days';
    case Weeks = 'weeks';
    case Months = 'months';
    case Years = 'years';

    /** Hours run against a meter; everything else runs against the calendar. */
    public function isMeterBased(): bool
    {
        return $this === self::Hours;
    }

    public function addTo(Carbon $date, float $value): Carbon
    {
        return match ($this) {
            self::Days => $date->copy()->addDays((int) round($value)),
            self::Weeks => $date->copy()->addWeeks((int) round($value)),
            self::Months => $date->copy()->addMonths((int) round($value)),
            self::Years => $date->copy()->addYears((int) round($value)),
            self::Hours => $date->copy(),
        };
    }

    /** Approximate span in days, for sorting and for the warning window. */
    public function approximateDays(float $value): float
    {
        return match ($this) {
            self::Days => $value,
            self::Weeks => $value * 7,
            self::Months => $value * 30.44,
            self::Years => $value * 365.25,
            self::Hours => 0,
        };
    }

    public function label(float $value): string
    {
        $unit = match ($this) {
            self::Hours => 'hrs',
            self::Days => 'day',
            self::Weeks => 'week',
            self::Months => 'month',
            self::Years => 'year',
        };

        $formatted = rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');

        if ($this === self::Hours) {
            return $formatted.' '.$unit;
        }

        return $formatted.' '.$unit.($value == 1 ? '' : 's');
    }
}
