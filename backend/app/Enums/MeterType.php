<?php

namespace App\Enums;

enum MeterType: string
{
    case RunningHours = 'running_hours';
    case Cycles = 'cycles';
    case Sailings = 'sailings';

    public function unit(): string
    {
        return match ($this) {
            self::RunningHours => 'hrs',
            self::Cycles => 'cycles',
            self::Sailings => 'sailings',
        };
    }
}
