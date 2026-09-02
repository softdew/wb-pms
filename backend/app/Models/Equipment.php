<?php

namespace App\Models;

use App\Enums\CriticalityBand;
use App\Enums\DutyStatus;
use App\Enums\MaintenanceStrategy;
use App\Enums\MeterType;
use App\Enums\TaxonomyLevel;
use App\Models\Concerns\BelongsToOrganisation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use App\Models\Concerns\ScopedToOperator;

class Equipment extends Model implements AuditableContract
{
    use Auditable, BelongsToOrganisation, HasFactory, ScopedToOperator, SoftDeletes;

    protected $table = 'equipment';

    protected $fillable = [
        'parent_id', 'taxonomy_level', 'vessel_id', 'location_id',
        'equipment_category_id', 'equipment_model_id',
        'code', 'name', 'serial_no',
        'installation_date', 'last_renewal_date', 'warranty_expiry_date',
        'duty_status', 'meter_type', 'statutory_item_ref', 'replacement_value',
        'hidden_failure_flag', 'status', 'remarks',
    ];

	// Reaches the operator through its vessel. Shore equipment has no vessel,
    // so it stays department-only and is filtered out for operator users.
    public function operatorRelationPath(): string
    {
        return 'vessel';
    }
	
    /**
     * Criticality and strategy are absent from $fillable on purpose. They are
     * only ever written through CriticalityService and MaintenanceStrategyService,
     * which enforce the approval and admissibility rules. A controller passing
     * request data straight into update() cannot bypass them.
     */
    protected function casts(): array
    {
        return [
            'installation_date' => 'date',
            'last_renewal_date' => 'date',
            'warranty_expiry_date' => 'date',
            'current_meter_reading_on' => 'date',
            'criticality_approved_at' => 'datetime',
            'current_meter_reading' => 'decimal:2',
            'replacement_value' => 'decimal:2',
            'hidden_failure_flag' => 'boolean',
            'rtf_consequence_tolerable' => 'boolean',
            'rtf_failure_evident' => 'boolean',
            'rtf_spare_held_or_cheap' => 'boolean',
            'rtf_no_statutory_requirement' => 'boolean',
            'taxonomy_level' => TaxonomyLevel::class,
            'duty_status' => DutyStatus::class,
            'meter_type' => MeterType::class,
            'criticality_band' => CriticalityBand::class,
            'maintenance_strategy' => MaintenanceStrategy::class,
        ];
    }

    // -- relations ----------------------------------------------------------

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function vessel(): BelongsTo
    {
        return $this->belongsTo(Vessel::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(EquipmentCategory::class, 'equipment_category_id');
    }

    public function model(): BelongsTo
    {
        return $this->belongsTo(EquipmentModel::class, 'equipment_model_id');
    }

    public function meterReadings(): HasMany
    {
        // id breaks the tie: two readings can share a date, and two assessments
        // can share a timestamp. Without it the 'latest' row is arbitrary.
        return $this->hasMany(EquipmentMeterReading::class)
            ->orderByDesc('reading_on')
            ->orderByDesc('id');
    }

    public function criticalityAssessments(): HasMany
    {
        return $this->hasMany(CriticalityAssessment::class)
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    // -- state ---------------------------------------------------------------

    public function isMetered(): bool
    {
        return $this->meter_type !== null;
    }

    public function hasApprovedCriticality(): bool
    {
        return $this->criticality_band !== null && $this->criticality_approved_at !== null;
    }

    /**
     * True where a run-to-failure strategy is not admissible regardless of the
     * four conditions: a hidden failure mode, or a statutory linkage.
     */
    public function isBarredFromRunToFailure(): bool
    {
        return $this->hidden_failure_flag || filled($this->statutory_item_ref);
    }

    /** All four admissibility conditions affirmed. */
    public function runToFailureConditionsAffirmed(): bool
    {
        return $this->rtf_consequence_tolerable
            && $this->rtf_failure_evident
            && $this->rtf_spare_held_or_cheap
            && $this->rtf_no_statutory_requirement;
    }

    /** Full path from the top of the hierarchy, for display. */
    public function ancestry(): string
    {
        $parts = [$this->name];
        $node = $this;

        while ($node = $node->parent) {
            array_unshift($parts, $node->name);
        }

        return implode(' / ', $parts);
    }

    // -- scopes --------------------------------------------------------------

    public function scopeInBand(Builder $query, CriticalityBand $band): Builder
    {
        return $query->where('criticality_band', $band);
    }

    public function scopeAwaitingCriticality(Builder $query): Builder
    {
        return $query->whereNull('criticality_band');
    }

    public function scopeMetered(Builder $query): Builder
    {
        return $query->whereNotNull('meter_type');
    }
	
	public function maintenancePlans(): HasMany
	{
		return $this->hasMany(MaintenancePlan::class);
	}

	/** Active plan lines in sheet order, for the monthly return. */
	public function maintenancePlansForExport()
	{
		return $this->maintenancePlans()
			->where('status', MaintenancePlan::STATUS_ACTIVE)
			->with('task')
			->get()
			->sortBy(fn (MaintenancePlan $plan) => $plan->task?->sort_order ?? 0);
	}
}
