<?php

namespace App\Console\Commands;

use App\Models\MaintenancePlan;
use App\Services\DueDateService;
use App\Support\Tenancy;
use Illuminate\Console\Command;

/**
 * Nightly recomputation of due points and status.
 *
 * Runs with no authenticated user, so it must establish tenant context for
 * itself. eachOrganisation() does that -- without it the global scope throws,
 * which is the intended behaviour.
 *
 *   php artisan cmms:recompute-due-dates
 */
class RecomputeDueDates extends Command
{
    protected $signature = 'cmms:recompute-due-dates {--organisation= : Limit to one organisation id}';

    protected $description = 'Recompute next due dates and due status for all active maintenance plans';

    public function handle(Tenancy $tenancy, DueDateService $dueDates): int
    {
        $total = 0;

        $work = function () use ($dueDates, &$total) {
            MaintenancePlan::query()
                ->active()
                ->automatic()
                ->with('equipment')
                ->chunkById(500, function ($plans) use ($dueDates, &$total) {
                    foreach ($plans as $plan) {
                        $dueDates->recompute($plan);
                        $total++;
                    }
                });
        };

        if ($id = $this->option('organisation')) {
            $tenancy->runFor((int) $id, $work);
        } else {
            $tenancy->eachOrganisation(fn () => $work());
        }

        $this->info("Recomputed {$total} maintenance plan(s).");

        return self::SUCCESS;
    }
}
