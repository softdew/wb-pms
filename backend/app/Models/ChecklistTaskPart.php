<?php

namespace App\Models;

use App\Enums\PartLineType;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistTaskPart extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $fillable = ['checklist_task_id', 'part_id', 'quantity', 'line_type', 'remarks'];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'line_type' => PartLineType::class,
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ChecklistTask::class, 'checklist_task_id');
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
