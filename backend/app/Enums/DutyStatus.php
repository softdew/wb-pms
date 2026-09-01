<?php

namespace App\Enums;

enum DutyStatus: string
{
    case Duty = 'duty';
    case Standby = 'standby';
    case Spare = 'spare';
}
