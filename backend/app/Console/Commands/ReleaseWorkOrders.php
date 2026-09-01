<?php

namespace App\Console\Commands;

use App\Enums\DueStatus;
use App\Models\MaintenancePlan;
use App\Services\DueDateService;
use App\Services\WorkOrderService;
use App\Support\Tenancy;
use Illuminate\Console\Command;

/**
 * Raise and release work orders for plan lines whose release point has arrived.
 *
 * Release runs ahead of the due date by the plan's lead time, which is normally
 * the longest procurement lead time on the parts the task calls for -- there is
 * no point releasing a job on the day it falls due if the gasket set takes six
 * weeks.
 *
 *   php artisan cmms:release-work-orders
 */
class ReleaseWorkOrders extends Command
{
    protected $signature = 'cmms:release-work-orders
                            {--organisation= : Limit to one organisation id}
                            {--dry-run : Report what would be released without writing}';

    protected $description = 'Raise and release work orders for maintenance plans that have reached their release point';

    public function handle(Tenancy $tenancy, DueDateService $dueDates, WorkOrderService $workOrders): int
    {
        $raised = 0;
        $dryRun = (bool) $this->option('dry-run');

        $work = function () use ($dueDates, $workOrders, &$raised, $dryRun) {
            MaintenancePlan::query()
                ->active()
                ->automatic()
                ->whereIn('due_status', [DueStatus::Due->value, DueStatus::DueSoon->value])
                ->with(['equipment', 'task'])
                ->chunkById(200, function ($plans) use ($dueDates, $workOrders, &$raised, $dryRun) {
                    foreach ($plans as $plan) {
                        // Meter lines have no release date, so a due status is
                        // the trigger. Calendar lines wait for the lead point.
                        if (! $plan->isMeterBased()) {
                            $releaseOn = $dueDates->releaseOn($plan);

                            if ($releaseOn && $releaseOn->isFuture()) {
                                continue;
                            }
                        }

                        if ($dryRun) {
                            $this->line(sprintf(
                                '  would raise: %s / %s',
                                $plan->equipment?->code,
                                $plan->task?->activity_description
                            ));
                            $raised++;

                            continue;
                        }

                        $workOrder = $workOrders->raiseFromPlan($plan);

                        if ($workOrder->wasRecentlyCreated || $workOrder->status->value === 'draft') {
                            $workOrders->release($workOrder);
                            $raised++;
                        }
                    }
                });
        };

        if ($id = $this->option('organisation')) {
            $tenancy->runFor((int) $id, $work);
        } else {
            $tenancy->eachOrganisation(fn () => $work());
        }

        $this->info($dryRun
            ? "{$raised} work order(s) would be raised."
            : "Raised and released {$raised} work order(s).");

        return self::SUCCESS;
    }
}
