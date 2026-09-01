<?php

namespace App\Enums;

/**
 * The three states on the client's own sheets: ok, soon, due.
 *
 * "Soon" is the amber window -- work that is not yet due but close enough that
 * spares and vessel availability need arranging.
 */
enum DueStatus: string
{
    case OnTrack = 'on_track';
    case DueSoon = 'due_soon';
    case Due = 'due';

    /** The label used on the client's returns. */
    public function sheetLabel(): string
    {
        return match ($this) {
            self::OnTrack => 'ok',
            self::DueSoon => 'soon',
            self::Due => 'due',
        };
    }

    public function colour(): string
    {
        return match ($this) {
            self::OnTrack => 'green',
            self::DueSoon => 'amber',
            self::Due => 'red',
        };
    }
}
