<?php

namespace App\Services;

use App\Enums\AssessmentStatus;
use App\Enums\CriticalityBand;
use App\Exceptions\MaintenanceRuleException;
use App\Models\CriticalityAssessment;
use App\Models\CriticalityScalePoint;
use App\Models\CriticalitySetting;
use App\Models\Equipment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Criticality index = Consequence x Exposure x Redundancy, banded against
 * configurable thresholds.
 *
 * The system computes and records. It does not decide: the score is entered by
 * the technical department and the band is released only when a different,
 * authorised person approves it.
 */
class CriticalityService
{
    /**
     * Record a score. The assessment is pending until approved -- the equipment
     * row is untouched at this point.
     */
    public function score(
        Equipment $equipment,
        int $consequence,
        int $exposure,
        int $redundancy,
        User $assessor,
        ?string $justification = null,
        string $reviewTrigger = CriticalityAssessment::TRIGGER_INITIAL,
    ): CriticalityAssessment {
        $this->guardFactorRange('C', $consequence);
        $this->guardFactorRange('E', $exposure);
        $this->guardFactorRange('R', $redundancy);

        $settings = $this->settings();
        $index = $consequence * $exposure * $redundancy;

        // Supersede any assessment still awaiting a decision, so an asset never
        // has two competing scores in the queue.
        CriticalityAssessment::query()
            ->where('equipment_id', $equipment->id)
            ->pending()
            ->update([
                'status' => AssessmentStatus::Rejected,
                'decision_remarks' => 'Superseded by a later assessment.',
            ]);

        return CriticalityAssessment::create([
            'equipment_id' => $equipment->id,
            'consequence_c' => $consequence,
            'exposure_e' => $exposure,
            'redundancy_r' => $redundancy,
            'criticality_index' => $index,
            'band' => $settings->bandFor($index),
            'high_threshold_applied' => $settings->high_threshold,
            'medium_threshold_applied' => $settings->medium_threshold,
            'status' => AssessmentStatus::Pending,
            'assessed_by' => $assessor->id,
            'assessed_at' => now(),
            'review_trigger' => $reviewTrigger,
            'justification' => $justification,
        ]);
    }

    /**
     * Release the band onto the equipment record.
     *
     * The approver must be someone other than the assessor. Scoring and
     * ratification are separate acts; letting one person do both would make the
     * approval step decorative.
     */
    public function approve(
        CriticalityAssessment $assessment,
        User $approver,
        ?string $remarks = null,
    ): CriticalityAssessment {
        if ($assessment->status !== AssessmentStatus::Pending) {
            throw new MaintenanceRuleException(
                'This assessment has already been decided and cannot be approved again.'
            );
        }

        if ($assessment->assessed_by === $approver->id) {
            throw new MaintenanceRuleException(
                'A criticality assessment must be approved by someone other than the person who scored it.'
            );
        }

        return DB::transaction(function () use ($assessment, $approver, $remarks) {
            $assessment->update([
                'status' => AssessmentStatus::Approved,
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'decision_remarks' => $remarks,
            ]);

            $equipment = $assessment->equipment;

            $equipment->forceFill([
                'criticality_c' => $assessment->consequence_c,
                'criticality_e' => $assessment->exposure_e,
                'criticality_r' => $assessment->redundancy_r,
                'criticality_index' => $assessment->criticality_index,
                'criticality_band' => $assessment->band,
                'criticality_approved_at' => $assessment->approved_at,
                'criticality_approved_by' => $approver->id,
            ])->save();

            return $assessment->refresh();
        });
    }

    public function reject(
        CriticalityAssessment $assessment,
        User $approver,
        string $reason,
    ): CriticalityAssessment {
        if ($assessment->status !== AssessmentStatus::Pending) {
            throw new MaintenanceRuleException('This assessment has already been decided.');
        }

        $assessment->update([
            'status' => AssessmentStatus::Rejected,
            'approved_by' => $approver->id,
            'approved_at' => now(),
            'decision_remarks' => $reason,
        ]);

        return $assessment->refresh();
    }

    /**
     * Raise a review flag on the four events that re-open a band:
     * modification or re-engining, change of route or duty, serious or repeated
     * failure, and a change in statutory status.
     */
    public function flagForReview(Equipment $equipment, string $reviewTrigger, ?string $note = null): CriticalityAssessment
    {
        if (! $equipment->hasApprovedCriticality()) {
            throw new MaintenanceRuleException(
                'This asset has no approved criticality band to review.'
            );
        }

        return CriticalityAssessment::create([
            'equipment_id' => $equipment->id,
            'consequence_c' => $equipment->criticality_c,
            'exposure_e' => $equipment->criticality_e,
            'redundancy_r' => $equipment->criticality_r,
            'criticality_index' => $equipment->criticality_index,
            'band' => $equipment->criticality_band,
            'high_threshold_applied' => $this->settings()->high_threshold,
            'medium_threshold_applied' => $this->settings()->medium_threshold,
            'status' => AssessmentStatus::Pending,
            'review_trigger' => $reviewTrigger,
            'justification' => $note,
        ]);
    }

    /**
     * Distribution across the register, to support calibrating the thresholds.
     * The High band is normally expected to hold 10-20 per cent of assets; a
     * figure far outside that says the anchors need revisiting, not the assets.
     *
     * @return array{high:int, medium:int, low:int, unassessed:int, total:int, high_percent:float}
     */
    public function bandDistribution(): array
    {
        $counts = Equipment::query()
            ->selectRaw('criticality_band, count(*) as total')
            ->groupBy('criticality_band')
            ->pluck('total', 'criticality_band');

        $high = (int) ($counts[CriticalityBand::High->value] ?? 0);
        $medium = (int) ($counts[CriticalityBand::Medium->value] ?? 0);
        $low = (int) ($counts[CriticalityBand::Low->value] ?? 0);
        $unassessed = (int) ($counts[''] ?? $counts[null] ?? 0);
        $assessed = $high + $medium + $low;

        return [
            'high' => $high,
            'medium' => $medium,
            'low' => $low,
            'unassessed' => $unassessed,
            'total' => $assessed + $unassessed,
            'high_percent' => $assessed > 0 ? round($high / $assessed * 100, 1) : 0.0,
        ];
    }

    protected function settings(): CriticalitySetting
    {
        $settings = CriticalitySetting::first();

        if (! $settings) {
            throw new MaintenanceRuleException(
                'Criticality thresholds have not been configured for this organisation.'
            );
        }

        return $settings;
    }

    protected function guardFactorRange(string $factor, int $value): void
    {
        [$min, $max] = CriticalityScalePoint::RANGES[$factor];

        if ($value < $min || $value > $max) {
            throw new MaintenanceRuleException(
                sprintf('%s must be between %d and %d; %d given.', $factor, $min, $max, $value)
            );
        }
    }
}
