<?php

namespace Tests\Feature\Block2;

use App\Enums\AssessmentStatus;
use App\Enums\CriticalityBand;
use App\Exceptions\MaintenanceRuleException;
use App\Models\CriticalityAssessment;
use App\Services\CriticalityService;
use PHPUnit\Framework\Attributes\DataProvider;

class CriticalityScoringTest extends Block2TestCase
{
    protected CriticalityService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(CriticalityService::class);
    }

    public function test_the_index_is_the_product_of_the_three_factors(): void
    {
        $assessment = $this->service->score($this->makeEquipment(), 5, 5, 3, $this->engineer);

        $this->assertSame(75, $assessment->criticality_index);
        $this->assertSame(CriticalityBand::High, $assessment->band);
    }

    public static function bandingProvider(): array
    {
        return [
            'ceiling'          => [5, 5, 3, 75, CriticalityBand::High],
            'on high boundary' => [5, 3, 2, 30, CriticalityBand::High],
            'just below high'  => [5, 3, 1, 15, CriticalityBand::Medium],
            'on medium bound'  => [4, 3, 1, 12, CriticalityBand::Medium],
            'just below med'   => [1, 1, 3, 3, CriticalityBand::Low],
            'floor'            => [1, 1, 1, 1, CriticalityBand::Low],
        ];
    }

    #[DataProvider('bandingProvider')]
    public function test_bands_fall_where_the_thresholds_put_them(
        int $c, int $e, int $r, int $expectedIndex, CriticalityBand $expectedBand
    ): void {
        $assessment = $this->service->score($this->makeEquipment(), $c, $e, $r, $this->engineer);

        $this->assertSame($expectedIndex, $assessment->criticality_index);
        $this->assertSame($expectedBand, $assessment->band);
    }

    public function test_factors_outside_their_scale_are_rejected(): void
    {
        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('R must be between 1 and 3');

        $this->service->score($this->makeEquipment(), 3, 3, 5, $this->engineer);
    }

    /** Scoring alone changes nothing on the register. */
    public function test_a_pending_assessment_does_not_touch_the_equipment(): void
    {
        $equipment = $this->makeEquipment();
        $this->service->score($equipment, 5, 5, 3, $this->engineer);

        $equipment->refresh();

        $this->assertNull($equipment->criticality_band);
        $this->assertNull($equipment->criticality_index);
        $this->assertFalse($equipment->hasApprovedCriticality());
    }

    public function test_approval_releases_the_band_onto_the_equipment(): void
    {
        $equipment = $this->makeEquipment();
        $assessment = $this->service->score($equipment, 5, 4, 3, $this->engineer);

        $this->service->approve($assessment, $this->authority);

        $equipment->refresh();

        $this->assertSame(60, $equipment->criticality_index);
        $this->assertSame(CriticalityBand::High, $equipment->criticality_band);
        $this->assertSame($this->authority->id, $equipment->criticality_approved_by);
        $this->assertTrue($equipment->hasApprovedCriticality());
    }

    /** The rule that makes the approval step mean something. */
    public function test_the_assessor_cannot_approve_their_own_assessment(): void
    {
        $assessment = $this->service->score($this->makeEquipment(), 4, 4, 2, $this->engineer);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('other than the person who scored it');

        $this->service->approve($assessment, $this->engineer);
    }

    public function test_an_assessment_cannot_be_decided_twice(): void
    {
        $assessment = $this->service->score($this->makeEquipment(), 3, 3, 2, $this->engineer);
        $this->service->approve($assessment, $this->authority);

        $this->expectException(MaintenanceRuleException::class);

        $this->service->approve($assessment, $this->authority);
    }

    public function test_rejection_leaves_the_equipment_unbanded(): void
    {
        $equipment = $this->makeEquipment();
        $assessment = $this->service->score($equipment, 5, 5, 3, $this->engineer);

        $this->service->reject($assessment, $this->authority, 'Exposure overstated for a standby unit.');

        $this->assertSame(AssessmentStatus::Rejected, $assessment->refresh()->status);
        $this->assertNull($equipment->refresh()->criticality_band);
    }

    /** An asset must never have two live scores in the queue. */
    public function test_a_new_score_supersedes_one_still_pending(): void
    {
        $equipment = $this->makeEquipment();
        $first = $this->service->score($equipment, 5, 5, 3, $this->engineer);
        $second = $this->service->score($equipment, 2, 2, 1, $this->engineer);

        $this->assertSame(AssessmentStatus::Rejected, $first->refresh()->status);
        $this->assertSame(AssessmentStatus::Pending, $second->refresh()->status);
        $this->assertSame(1, CriticalityAssessment::pending()->count());
    }

    /** Recalibrating thresholds must not rewrite decisions already taken. */
    public function test_an_approved_assessment_keeps_the_thresholds_it_was_judged_under(): void
    {
        $equipment = $this->makeEquipment();
        $assessment = $this->service->score($equipment, 5, 3, 2, $this->engineer); // index 30 -> high
        $this->service->approve($assessment, $this->authority);

        \App\Models\CriticalitySetting::first()->update(['high_threshold' => 40]);

        $this->assertSame(30, $assessment->refresh()->high_threshold_applied);
        $this->assertSame(CriticalityBand::High, $assessment->band);
    }

    public function test_the_full_history_is_retained(): void
    {
        $equipment = $this->makeEquipment();

        $first = $this->service->score($equipment, 5, 5, 3, $this->engineer, 'Initial assessment');
        $this->service->approve($first, $this->authority);

        $second = $this->service->score(
            $equipment, 3, 3, 1, $this->engineer,
            'Re-engined, redundancy improved',
            CriticalityAssessment::TRIGGER_MODIFICATION
        );
        $this->service->approve($second, $this->authority);

        $this->assertSame(2, $equipment->criticalityAssessments()->count());
        $this->assertSame(CriticalityBand::Low, $equipment->refresh()->criticality_band);
        $this->assertSame(
            CriticalityAssessment::TRIGGER_MODIFICATION,
            $equipment->criticalityAssessments()->first()->review_trigger
        );
    }

    public function test_review_can_be_flagged_on_a_banded_asset(): void
    {
        $equipment = $this->makeEquipment();
        $this->service->approve(
            $this->service->score($equipment, 4, 4, 2, $this->engineer),
            $this->authority
        );

        $flag = $this->service->flagForReview(
            $equipment->refresh(),
            CriticalityAssessment::TRIGGER_REPEATED_FAILURE,
            'Third failure in six months.'
        );

        $this->assertSame(AssessmentStatus::Pending, $flag->status);
        $this->assertSame(CriticalityBand::High, $equipment->refresh()->criticality_band,
            'Flagging a review must not strip the current band.');
    }

    public function test_band_distribution_reports_the_high_proportion(): void
    {
        foreach ([[5, 5, 3], [2, 2, 1], [1, 1, 1], [1, 1, 1]] as [$c, $e, $r]) {
            $equipment = $this->makeEquipment();
            $this->service->approve($this->service->score($equipment, $c, $e, $r, $this->engineer), $this->authority);
        }

        $distribution = $this->service->bandDistribution();

        $this->assertSame(1, $distribution['high']);
        $this->assertSame(3, $distribution['low']);
        $this->assertSame(25.0, $distribution['high_percent']);
    }
}
