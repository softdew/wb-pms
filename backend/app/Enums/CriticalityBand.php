<?php

namespace App\Enums;

enum CriticalityBand: string
{
    case High = 'high';
    case Medium = 'medium';
    case Low = 'low';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
