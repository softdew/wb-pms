<?php

namespace Database\Seeders;

use App\Models\CriticalityScalePoint;
use App\Models\CriticalitySetting;
use App\Models\EquipmentCategory;
use App\Models\FailureCode;
use App\Models\Organisation;
use App\Models\PartCategory;
use App\Models\Trade;
use App\Support\Tenancy;
use Illuminate\Database\Seeder;
use App\Models\MaintenanceSetting;

/**
 * Reference data is copied into each organisation when it is created, rather
 * than shared as global rows. That keeps the tenant scope free of nulls and
 * lets an operator edit its own copy without affecting anyone else.
 *
 *   php artisan db:seed --class=ReferenceDataSeeder
 */
class ReferenceDataSeeder extends Seeder
{
    public function run(?Organisation $organisation = null): void
    {
        $tenancy = app(Tenancy::class);

        if ($organisation) {
            $tenancy->runFor($organisation, fn () => $this->seedOne());

            return;
        }

        $tenancy->eachOrganisation(fn () => $this->seedOne());
    }

    protected function seedOne(): void
    {
        $this->seedCriticalityScales();
		MaintenanceSetting::current();
        $this->seedFailureCodes();
        $this->seedEquipmentCategories();
        $this->seedPartCategories();
        $this->seedTrades();
    }

    protected function seedCriticalityScales(): void
    {
        CriticalitySetting::firstOrCreate([], [
            'high_threshold' => 30,
            'medium_threshold' => 12,
        ]);

        $points = [
            ['C', 1, 'Negligible', 'No safety, service or regulatory effect.'],
            ['C', 2, 'Minor', 'Minor operational inconvenience, absorbed within the day.'],
            ['C', 3, 'Moderate', 'Sailing cancelled or service degraded.'],
            ['C', 4, 'Major', 'Multiple sailings lost or significant regulatory exposure.'],
            ['C', 5, 'Severe', 'Injury or fatality potential, pollution, vessel detained or certificate invalidated.'],

            ['E', 1, 'Seasonal / standby', 'Seasonal or standby duty in benign conditions.'],
            ['E', 2, 'Intermittent', 'Used intermittently or on limited routes.'],
            ['E', 3, 'Regular', 'Regular service with recovery periods.'],
            ['E', 4, 'Heavy', 'Near-continuous operation with limited downtime.'],
            ['E', 5, 'Continuous / arduous', 'Continuous daily operation in silt-laden, tidal and monsoon conditions.'],

            ['R', 1, 'Redundant', 'Installed standby or immediate substitute available.'],
            ['R', 2, 'Partial', 'Partial redundancy or an accepted manual workaround.'],
            ['R', 3, 'Single point of failure', 'No substitute available.'],
        ];

        foreach ($points as [$factor, $value, $label, $anchor]) {
            CriticalityScalePoint::firstOrCreate(
                ['factor' => $factor, 'value' => $value],
                ['label' => $label, 'anchor' => $anchor],
            );
        }
    }

    protected function seedFailureCodes(): void
    {
        $codes = [
            FailureCode::TYPE_FAILURE_MODE => [
                'FTS' => 'Fail to start on demand',
                'STP' => 'Fails to stop on demand',
                'BRD' => 'Breakdown in service',
                'ELP' => 'External leakage - process medium',
                'ELU' => 'External leakage - utility medium',
                'INL' => 'Internal leakage',
                'VIB' => 'Vibration',
                'NOI' => 'Abnormal noise',
                'OHE' => 'Overheating',
                'ERO' => 'Erratic output',
                'LOO' => 'Low output',
                'PLU' => 'Plugged or choked',
                'STD' => 'Structural deficiency',
                'CorR' => 'Corrosion or wastage',
                'OTH' => 'Other',
            ],
            FailureCode::TYPE_CAUSE => [
                'WEA' => 'Normal wear and tear',
                'LUB' => 'Inadequate or contaminated lubrication',
                'CON' => 'Contamination - fuel, water or silt ingress',
                'MIS' => 'Misalignment or imbalance',
                'FAT' => 'Fatigue or material defect',
                'COR' => 'Corrosion',
                'IMP' => 'Improper installation or assembly',
                'OPE' => 'Operating error or abuse',
                'MNT' => 'Maintenance error or omission',
                'DES' => 'Design deficiency',
                'EXT' => 'External event - grounding, contact, weather',
                'UNK' => 'Cause not established',
            ],
            FailureCode::TYPE_DETECTION_METHOD => [
                'PMI' => 'Preventive maintenance inspection',
                'FFT' => 'Failure-finding task',
                'OPR' => 'Observed by operating crew',
                'ALM' => 'Alarm or instrument indication',
                'CBM' => 'Condition monitoring reading',
                'STA' => 'Statutory or class survey',
                'SVC' => 'Reported during other work',
                'FAI' => 'Detected on failure',
            ],
            FailureCode::TYPE_SEVERITY => [
                'CRI' => 'Critical - loss of function, vessel withdrawn',
                'DEG' => 'Degraded - function impaired, service continued',
                'INC' => 'Incipient - defect found before loss of function',
                'NIL' => 'No defect found',
            ],
        ];

        foreach ($codes as $type => $set) {
            $order = 0;
            foreach ($set as $code => $description) {
                FailureCode::firstOrCreate(
                    ['type' => $type, 'code' => $code],
                    ['description' => $description, 'sort_order' => $order += 10],
                );
            }
        }
    }

    protected function seedEquipmentCategories(): void
    {
        $categories = [
            'ME' => 'Main Engine',
            'AE' => 'Auxiliary Engine',
            'GEN' => 'Generator',
            'PMP' => 'Pumps',
            'STG' => 'Steering System',
            'FFA' => 'Fire-Fighting System',
            'ELP' => 'Electrical Panels',
            'HVA' => 'HVAC System',
            'NAV' => 'Navigation Equipment',
            'DKM' => 'Deck Machinery',
            'HUL' => 'Hull & Structure',
            'LSA' => 'Life-Saving Appliances',
        ];

        foreach ($categories as $code => $name) {
            EquipmentCategory::firstOrCreate(['code' => $code], ['name' => $name]);
        }
    }

    protected function seedPartCategories(): void
    {
        $categories = [
            'ENG' => 'Engine Spares',
            'PMP' => 'Pump Spares',
            'ELE' => 'Electrical',
            'HYD' => 'Hydraulics',
            'FLT' => 'Filters',
            'LUB' => 'Lubricants & Oils',
            'CON' => 'Consumables',
            'SAF' => 'Safety Equipment',
            'HAR' => 'Hardware & Fasteners',
        ];

        foreach ($categories as $code => $name) {
            PartCategory::firstOrCreate(['code' => $code], ['name' => $name]);
        }
    }

    protected function seedTrades(): void
    {
        $trades = [
            'ENGR' => 'Marine Engineer',
            'FITT' => 'Fitter',
            'ELEC' => 'Electrician',
            'WELD' => 'Welder',
            'PAIN' => 'Painter / Blaster',
            'DECK' => 'Deck Crew',
            'CONT' => 'Contractor Technician',
        ];

        foreach ($trades as $code => $name) {
            Trade::firstOrCreate(['code' => $code], ['name' => $name]);
        }
    }
}
