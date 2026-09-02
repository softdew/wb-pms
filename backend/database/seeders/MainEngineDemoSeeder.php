<?php

namespace Database\Seeders;

use App\Enums\MeterType;
use App\Models\ChecklistTask;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentModel;
use App\Models\Organisation;
use App\Models\ShipType;
use App\Models\User;
use App\Models\Vessel;
use App\Services\MeterReadingService;
use App\Services\PlanDerivationService;
use App\Support\Tenancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Loads the client's own Main Engine sheet into the system.
 *
 * Every task, interval and reference section below is taken from
 * SM_Templates.xlsx as supplied. Running hours are set to 3,200 and the two
 * recorded overhauls are the ones on their sheet, so the computed due status
 * for each row can be compared directly against their column H.
 *
 *   php artisan db:seed --class=MainEngineDemoSeeder
 */
class MainEngineDemoSeeder extends Seeder
{
    /**
     * Their rows, in sheet order.
     *
     * [reference, activity, interval hours, first-service hours, last done hrs, last done date]
     */
    protected array $tasks = [
        ['5.1.1',  'Engine oil level',                                          10,   null, null, null],
        ['5.3.1',  'Coolant level in radiator and compensatory tank',           10,   null, null, null],
        ['5.4.2',  'Restriction indicator of dry type cleaner',                 10,   null, null, null],
        [null,     'Rubber hose and clips of dry type air cleaner / radiator',  10,   null, null, null],
        ['5.1.2',  'Change engine oil',                                         500,  50,   2600, '2025-08-25'],
        ['5.1.3',  'Lube oil filter cartridge',                                 500,  50,   3100, '2025-02-09'],
        ['5.7.2',  'Check / adjust battery and lead connections',               50,   null, null, null],
        ['5.4',    'Check / adjust V-belt condition and tension',               250,  null, 3150, '2025-09-10'],
        ['5.3.1',  'Clean radiator fins externally',                            250,  null, null, null],
        ['5.3.2',  'Clean radiator tubes internally',                           5000, null, null, null],
        ['5.2.2',  'Change fuel filter insert - pre filter',                    500,  null, null, null],
        ['5.2.2',  'Change fuel filter insert - micro filter',                  750,  null, null, null],
        [null,     'Check / adjust injector',                                   2500, null, null, null],
        [null,     'Clean fuel strainer (button filter)',                       250,  null, null, null],
        ['5.3.3',  'Check / adjust thermostat element',                         5000, null, null, null],
        ['5.6.1',  'Check / adjust valve clearance',                            2500, null, null, null],
        [null,     'Check / adjust starter / alternator',                       2500, null, null, null],
        [null,     'Check / adjust fasteners',                                  2500, null, null, null],
        [null,     'Check / adjust exhaust silencer',                           5000, null, null, null],
        [null,     'Top overhaul of engine (servicing of combustion system)',   5000, null, null, null],
        [null,     'Total major overhaul of engine',                            9000, null, null, null],
    ];

    public function run(): void
    {
        $organisation = Organisation::firstOrCreate(
            ['code' => 'WBTC'],
            ['name' => 'West Bengal Transport Corporation']
        );

        app(ReferenceDataSeeder::class)->run($organisation);

        app(Tenancy::class)->runFor($organisation, function () {
            $incharge = User::firstOrCreate(
                ['email' => 'incharge@wbtc.test'],
                [
                    'organisation_id' => app(Tenancy::class)->id(),
                    'name' => 'Vessel Incharge',
                    'password' => 'password',
                ]
            );

            $shipType = ShipType::firstOrCreate(
                ['code' => 'FERRY'],
                ['name' => 'Passenger Ferry', 'category' => 'Ferry', 'operating_zone' => 'river']
            );

            $vessel = Vessel::firstOrCreate(
                ['code' => 'MV01'],
                [
                    'ship_type_id' => $shipType->id,
                    'name' => 'MV Sagarika',
                    'registration_no' => 'WB-IV-2019-0451',
                    'incharge_user_id' => $incharge->id,
                    'commission_date' => '2019-04-01',
                ]
            );

            $category = EquipmentCategory::firstWhere('code', 'ME');

            $model = EquipmentModel::firstOrCreate(
                ['make' => 'Kirloskar', 'model' => 'R1040'],
                ['oem' => 'Kirloskar Oil Engines Ltd', 'equipment_category_id' => $category->id]
            );

            $engine = Equipment::firstOrCreate(
                ['code' => 'MV01-ME-01'],
                [
                    'vessel_id' => $vessel->id,
                    'equipment_category_id' => $category->id,
                    'equipment_model_id' => $model->id,
                    'name' => 'Main Engine',
                    'serial_no' => 'KOEL-R1040-44718',
                    'installation_date' => '2019-04-01',
                    'meter_type' => MeterType::RunningHours,
                    'taxonomy_level' => 'equipment_unit',
                ]
            );

            // Their header: total 3,200 hrs, with the previous month at 2,950
            // so the month-on-month figure has something to compute from.
            $meters = app(MeterReadingService::class);

            if ($engine->meterReadings()->count() === 0) {
                $meters->record($engine, 2950, Carbon::parse('2026-08-01'), $incharge);
                $meters->record($engine->refresh(), 3200, Carbon::parse('2026-09-01'), $incharge);
            }

            $plans = app(PlanDerivationService::class);
            $engine->refresh();

            foreach ($this->tasks as $index => [$reference, $activity, $interval, $first, $lastHours, $lastDate]) {
                $task = ChecklistTask::firstOrCreate(
                    ['code' => 'ME-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT)],
                    [
                        'equipment_category_id' => $category->id,
                        'activity_description' => $activity,
                        'section' => 'Main Engine Overhaul',
                        'sort_order' => ($index + 1) * 10,
                        'default_interval_value' => $interval,
                        'default_interval_unit' => 'hours',
                        'first_interval_value' => $first,
                        'default_trigger_class' => 'meter',
                        'controlling_reference' => $reference,
                    ]
                );

                $plans->apply($engine, $task, [
                    'last_done_meter_reading' => $lastHours,
                    'last_done_on' => $lastDate ? Carbon::parse($lastDate) : null,
                ]);
            }

            $this->command?->info(sprintf(
                'Seeded %s / %s at %s hrs with %d planned tasks.',
                $vessel->name,
                $engine->name,
                number_format((float) $engine->refresh()->current_meter_reading),
                count($this->tasks),
            ));
        });
    }
}
