<?php

namespace App\Console\Commands;

use App\Exports\MainEngineSheetExport;
use App\Models\Equipment;
use App\Models\Organisation;
use App\Services\DueDateService;
use App\Support\Tenancy;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Generate the client's monthly Main Engine return.
 *
 *   php artisan cmms:export-main-engine MV01-ME-01
 *   php artisan cmms:export-main-engine MV01-ME-01 --month=2026-09
 */
class ExportMainEngineSheet extends Command
{
    protected $signature = 'cmms:export-main-engine
                            {equipment : Equipment code}
                            {--organisation=1 : Organisation id}
                            {--month= : Reporting month as YYYY-MM, defaults to the current month}';

    protected $description = "Export a vessel's Main Engine maintenance return as an Excel file";

    public function handle(Tenancy $tenancy, DueDateService $dueDates): int
    {
        $organisation = Organisation::find((int) $this->option('organisation'));

        if (! $organisation) {
            $this->error('Organisation not found.');

            return self::FAILURE;
        }

        return $tenancy->runFor($organisation, function () use ($dueDates) {
            $equipment = Equipment::firstWhere('code', $this->argument('equipment'));

            if (! $equipment) {
                $this->error('Equipment "'.$this->argument('equipment').'" not found.');

                return self::FAILURE;
            }

            $end = $this->option('month')
                ? Carbon::createFromFormat('Y-m', $this->option('month'))->endOfMonth()
                : now()->endOfMonth();
            $start = $end->copy()->startOfMonth()->subMonth();

            // Make sure the statuses being reported are current.
            foreach ($equipment->maintenancePlansForExport() as $plan) {
                $dueDates->recompute($plan);
            }

            $filename = sprintf(
                '%s-%s-%s.xlsx',
                str($equipment->vessel?->code ?? 'asset')->slug(),
                'main-engine',
                $end->format('Y-m'),
            );

            Excel::store(new MainEngineSheetExport($equipment->refresh(), $start, $end), $filename, 'local');

            $this->info('Written to storage/app/private/'.$filename);
            $this->line('(or storage/app/'.$filename.' depending on your filesystem configuration)');

            return self::SUCCESS;
        });
    }
}
