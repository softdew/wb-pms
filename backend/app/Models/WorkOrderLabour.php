<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderLabour extends Model
{
    use BelongsToOrganisation, HasFactory;

    protected $table = 'work_order_labour';

    protected $fillable = [
        'work_order_id', 'trade_id', 'user_id',
        'standard_hours', 'actual_hours', 'persons', 'worked_on',
    ];

    protected function casts(): array
    {
        return [
            'standard_hours' => 'decimal:2',
            'actual_hours' => 'decimal:2',
            'worked_on' => 'date',
        ];
    }

    public function trade(): BelongsTo
    {
        return $this->belongsTo(Trade::class);
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }
}
