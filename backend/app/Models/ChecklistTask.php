<?php

namespace App\Models;

use App\Enums\IntervalUnit;
use App\Enums\TriggerClass;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChecklistTask extends Model
{
    use BelongsToOrganisation, HasFactory, SoftDeletes;

    protected $fillable = [
        'equipment_category_id', 'code', 'activity_description',
        'section', 'sort_order',
        'default_interval_value', 'default_interval_unit', 'first_interval_value',
        'default_trigger_class', 'controlling_reference',
        'estimated_hours', 'trade_id', 'persons_required',
        'safety_instructions', 'permits_required', 'acceptance_criteria',
        'criticality', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'default_interval_value' => 'decimal:2',
            'first_interval_value' => 'decimal:2',
            'estimated_hours' => 'decimal:2',
            'default_interval_unit' => IntervalUnit::class,
            'default_trigger_class' => TriggerClass::class,
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(EquipmentCategory::class, 'equipment_category_id');
    }

    public function trade(): BelongsTo
    {
        return $this->belongsTo(Trade::class);
    }

    public function parts(): HasMany
    {
        return $this->hasMany(ChecklistTaskPart::class);
    }

    public function readings(): HasMany
    {
        return $this->hasMany(ChecklistTaskReading::class)->orderBy('sort_order')->orderBy('id');
    }

    public function plans(): HasMany
    {
        return $this->hasMany(MaintenancePlan::class);
    }

    /** How many assets this task is applied to. Low reuse means proliferation. */
    public function reuseCount(): int
    {
        return $this->plans()->distinct('equipment_id')->count('equipment_id');
    }

    /** Longest procurement lead time across the parts this task calls for. */
    public function longestPartLeadTimeDays(): int
    {
        return (int) $this->parts()
            ->join('parts', 'parts.id', '=', 'checklist_task_parts.part_id')
            ->max('parts.lead_time_days') ?: 0;
    }

    public function intervalLabel(): ?string
    {
        if ($this->default_interval_value === null || $this->default_interval_unit === null) {
            return null;
        }

        return $this->default_interval_unit->label((float) $this->default_interval_value);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeForCategory(Builder $query, int $categoryId): Builder
    {
        return $query->where('equipment_category_id', $categoryId);
    }
}
