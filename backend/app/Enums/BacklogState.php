<?php

namespace App\Enums;

/**
 * Backlog reported in three states rather than one figure, so the constraint is
 * visible as labour, procurement or operations instead of being hidden in a
 * single number.
 */
enum BacklogState: string
{
    case ReadyToExecute = 'ready_to_execute';
    case WaitingOnMaterial = 'waiting_on_material';
    case WaitingOnAssetAvailability = 'waiting_on_asset_availability';

    public function label(): string
    {
        return match ($this) {
            self::ReadyToExecute => 'Ready to execute',
            self::WaitingOnMaterial => 'Waiting on material',
            self::WaitingOnAssetAvailability => 'Waiting on asset availability',
        };
    }
}
