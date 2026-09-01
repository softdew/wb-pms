<?php

namespace Tests\Feature\Block2;

use App\Enums\MaintenanceStrategy;
use App\Exceptions\MaintenanceRuleException;
use App\Services\CriticalityService;
use App\Services\MaintenanceStrategyService;

class MaintenanceStrategyTest extends Block2TestCase
{
    protected MaintenanceStrategyService $strategies;

    protected CriticalityService $criticality;

    protected function setUp(): void
    {
        parent::setUp();
        $this->strategies = app(MaintenanceStrategyService::class);
        $this->criticality = app(CriticalityService::class);
    }

    /** @param array{0:int,1:int,2:int} $score */
    protected function bandedEquipment(array $score, array $attributes = [])
    {
        $equipment = $this->makeEquipment($attributes);

        $this->criticality->approve(
            $this->criticality->score($equipment, ...[...$score, $this->engineer]),
            $this->authority
        );

        return $equipment->refresh();
    }

    protected function allConditions(): array
    {
        return [
            'consequence_tolerable' => true,
            'failure_evident' => true,
            'spare_held_or_cheap' => true,
            'no_statutory_requirement' => true,
        ];
    }

    public function test_strategy_cannot_be_assigned_before_the_band_is_approved(): void
    {
        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('before the criticality band is approved');

        $this->strategies->assign($this->makeEquipment(), MaintenanceStrategy::TimeOrUsageBased);
    }

    public function test_a_banded_asset_accepts_a_strategy(): void
    {
        $equipment = $this->bandedEquipment([4, 4, 2]);

        $this->strategies->assign($equipment, MaintenanceStrategy::AnalysisDerived);

        $this->assertSame(MaintenanceStrategy::AnalysisDerived, $equipment->refresh()->maintenance_strategy);
    }

    public function test_run_to_failure_needs_all_four_conditions(): void
    {
        $equipment = $this->bandedEquipment([1, 1, 1]);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('all four admissibility conditions');

        $this->strategies->assign($equipment, MaintenanceStrategy::InspectAndRunToFailure, [
            'consequence_tolerable' => true,
            'failure_evident' => true,
            // two missing
        ]);
    }

    public function test_run_to_failure_is_accepted_when_all_four_are_affirmed(): void
    {
        $equipment = $this->bandedEquipment([1, 1, 1]);

        $this->strategies->assign(
            $equipment,
            MaintenanceStrategy::InspectAndRunToFailure,
            $this->allConditions()
        );

        $equipment->refresh();

        $this->assertSame(MaintenanceStrategy::InspectAndRunToFailure, $equipment->maintenance_strategy);
        $this->assertTrue($equipment->runToFailureConditionsAffirmed());
    }

    /**
     * The guard that matters. A bilge alarm can be scored Low and still must
     * never be run to failure -- nobody would notice it had failed.
     */
    public function test_a_hidden_failure_mode_bars_run_to_failure_outright(): void
    {
        $equipment = $this->bandedEquipment([1, 1, 1], ['hidden_failure_flag' => true]);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('hidden failure mode');

        $this->strategies->assign(
            $equipment,
            MaintenanceStrategy::InspectAndRunToFailure,
            $this->allConditions()
        );
    }

    public function test_a_statutory_linkage_bars_run_to_failure_outright(): void
    {
        $equipment = $this->bandedEquipment([1, 1, 1], ['statutory_item_ref' => 'IV Rules Sch. II, item 4']);

        $this->expectException(MaintenanceRuleException::class);
        $this->expectExceptionMessage('statutory or class survey item');

        $this->strategies->assign(
            $equipment,
            MaintenanceStrategy::InspectAndRunToFailure,
            $this->allConditions()
        );
    }

    public function test_hidden_failure_does_not_block_other_strategies(): void
    {
        $equipment = $this->bandedEquipment([2, 2, 1], ['hidden_failure_flag' => true]);

        $this->strategies->assign($equipment, MaintenanceStrategy::TimeOrUsageBased);

        $this->assertSame(MaintenanceStrategy::TimeOrUsageBased, $equipment->refresh()->maintenance_strategy);
    }

    public function test_the_band_suggests_a_default_strategy(): void
    {
        $this->assertSame(
            MaintenanceStrategy::AnalysisDerived,
            $this->strategies->suggestFor($this->bandedEquipment([5, 5, 3]))
        );

        $this->assertSame(
            MaintenanceStrategy::TimeOrUsageBased,
            $this->strategies->suggestFor($this->bandedEquipment([4, 3, 1]))
        );

        $this->assertSame(
            MaintenanceStrategy::InspectAndRunToFailure,
            $this->strategies->suggestFor($this->bandedEquipment([1, 1, 1]))
        );
    }

    /** Departing from the default is allowed, but must be visible. */
    public function test_departures_from_the_band_default_are_listed(): void
    {
        $conforming = $this->bandedEquipment([5, 5, 3]);
        $this->strategies->assign($conforming, MaintenanceStrategy::AnalysisDerived);

        $departing = $this->bandedEquipment([5, 5, 3]);
        $this->strategies->assign($departing, MaintenanceStrategy::TimeOrUsageBased);

        $departures = $this->strategies->departuresFromBandDefault();

        $this->assertCount(1, $departures);
        $this->assertSame($departing->id, $departures->first()->id);
    }

    /** Strategy is not in $fillable, so mass assignment cannot bypass the guards. */
    public function test_strategy_cannot_be_mass_assigned(): void
    {
        $equipment = $this->bandedEquipment([1, 1, 1], ['hidden_failure_flag' => true]);

        $equipment->update(['maintenance_strategy' => MaintenanceStrategy::InspectAndRunToFailure->value]);

        $this->assertNull($equipment->refresh()->maintenance_strategy);
    }
}
