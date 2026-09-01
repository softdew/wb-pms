<?php

namespace App\Enums;

enum StockTransactionType: string
{
    case Receipt = 'receipt';
    case Issue = 'issue';
    case Return = 'return';
    case Adjustment = 'adjustment';

    /** Sign applied to the quantity when moving the balance. */
    public function direction(): int
    {
        return match ($this) {
            self::Receipt, self::Return => 1,
            self::Issue => -1,
            self::Adjustment => 0, // carries its own signed quantity
        };
    }
}
