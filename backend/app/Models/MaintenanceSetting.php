<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceSetting extends Model
{
    use BelongsToOrganisation, HasFactory;

    /**
     * Defaults declared on the model, not left to the database.
     *
     * firstOrCreate() returns the in-memory instance after insert without
     * re-reading the row, so column defaults defined only in the migration are
     * never hydrated and come back null.
     *
     * 250 hours and 14 days are starting points, not findings. The client's
     * sheet contains a single amber row, which places their hours window
     * somewhere between 200 and 400 but does not pin it down. Confirm both at
     * design freeze.
     */
    protected $attributes = [
        'warning_window_hours' => 250,
        'warning_window_days' => 14,
        'default_release_lead_days' => 7,
    ];

    protected $fillable = [
        'warning_window_hours', 'warning_window_days', 'default_release_lead_days',
    ];

    protected function casts(): array
    {
        return [
            'warning_window_hours' => 'decimal:2',
            'warning_window_days' => 'integer',
            'default_release_lead_days' => 'integer',
        ];
    }

    public static function current(): self
    {
        return static::firstOrCreate([]);
    }
}
