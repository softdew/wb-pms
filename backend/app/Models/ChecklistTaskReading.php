<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistTaskReading extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = [
        'checklist_task_id', 'parameter', 'unit',
        'minimum', 'maximum', 'is_mandatory', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'minimum' => 'decimal:4',
            'maximum' => 'decimal:4',
            'is_mandatory' => 'boolean',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ChecklistTask::class, 'checklist_task_id');
    }

    /** Whether a captured value sits inside the acceptance limits. */
    public function isWithinLimits(float $value): bool
    {
        if ($this->minimum !== null && $value < (float) $this->minimum) {
            return false;
        }

        if ($this->maximum !== null && $value > (float) $this->maximum) {
            return false;
        }

        return true;
    }
}
