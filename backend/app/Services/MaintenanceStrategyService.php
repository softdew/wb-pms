<?php

namespace App\Services;

use App\Enums\CriticalityBand;
use App\Enums\MaintenanceStrategy;
use App\Exceptions\MaintenanceRuleException;
use App\Models\Equipment;

/**
 * Strategy follows the approved band, with one hard guard.
 *
 * Run-to-failure is admissible only where the consequence is tolerable and
 * contained, the failure is evident, a spare is held or replacement is quick
 * and cheap, and no statutory requirement attaches. A hidden failure mode or a
 * statutory linkage bars it outright, whatever the four conditions say -- you
 * cannot run to failure on something whose failure nobody will notice.
 */
class MaintenanceStrategyService
{
    /**
     * @param  array<string,bool>  $runToFailureConditions  keys matching the rtf_* columns
     */
    public function assign(
        Equipment $equipment,
        MaintenanceStrategy $strategy,
        array $runToFailureConditions = [],
    ): Equipment {
        if (! $equipment->hasApprovedCriticality()) {
            throw new MaintenanceRuleException(
                'A maintenance strategy cannot be assigned before the criticality band is approved.'
            );
        }

        if ($strategy === MaintenanceStrategy::InspectAndRunToFailure) {
            $this->guardRunToFailure($equipment, $runToFailureConditions);
        }

        $attributes = ['maintenance_strategy' => $strategy];

        if ($strategy === MaintenanceStrategy::InspectAndRunToFailure) {
            $attributes += [
                'rtf_consequence_tolerable' => (bool) ($runToFailureConditions['consequence_tolerable'] ?? false),
                'rtf_failure_evident' => (bool) ($runToFailureConditions['failure_evident'] ?? false),
                'rtf_spare_held_or_cheap' => (bool) ($runToFailureConditions['spare_held_or_cheap'] ?? false),
                'rtf_no_statutory_requirement' => (bool) ($runToFailureConditions['no_statutory_requirement'] ?? false),
            ];
        }

        $equipment->forceFill($attributes)->save();

        return $equipment->refresh();
    }

    /**
     * The strategy the band would normally attract. Offered as a default; the
     * technical department may depart from it, and the departure is auditable.
     */
    public function suggestFor(Equipment $equipment): ?MaintenanceStrategy
    {
        return $equipment->criticality_band instanceof CriticalityBand
            ? MaintenanceStrategy::defaultFor($equipment->criticality_band)
            : null;
    }

    /**
     * Assets whose assigned strategy differs from the one their band would
     * normally attract. Not an error -- a list worth reviewing.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, Equipment>
     */
    public function departuresFromBandDefault()
    {
        return Equipment::query()
            ->whereNotNull('criticality_band')
            ->whereNotNull('maintenance_strategy')
            ->get()
            ->filter(fn (Equipment $e) => $e->maintenance_strategy !== MaintenanceStrategy::defaultFor($e->criticality_band))
            ->values();
    }

    /** @param  array<string,bool>  $conditions */
    protected function guardRunToFailure(Equipment $equipment, array $conditions): void
    {
        if ($equipment->hidden_failure_flag) {
            throw new MaintenanceRuleException(
                'Run-to-failure cannot be assigned to an asset with a hidden failure mode. '
                .'Its failure would not be evident in normal operation, so it requires a failure-finding task.'
            );
        }

        if (filled($equipment->statutory_item_ref)) {
            throw new MaintenanceRuleException(
                'Run-to-failure cannot be assigned to an asset linked to a statutory or class survey item.'
            );
        }

        $required = [
            'consequence_tolerable' => 'the consequence is tolerable and contained',
            'failure_evident' => 'the failure is evident in normal operation',
            'spare_held_or_cheap' => 'a spare is held or replacement is quick and cheap',
            'no_statutory_requirement' => 'no statutory, class or insurance requirement attaches',
        ];

        $unaffirmed = [];

        foreach ($required as $key => $description) {
            if (empty($conditions[$key])) {
                $unaffirmed[] = $description;
            }
        }

        if ($unaffirmed !== []) {
            throw new MaintenanceRuleException(
                'Run-to-failure requires all four admissibility conditions to be affirmed. Outstanding: '
                .implode('; ', $unaffirmed).'.'
            );
        }
    }
}
