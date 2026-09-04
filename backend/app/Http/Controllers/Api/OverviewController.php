<?php

namespace App\Http\Controllers\Api;

use App\Models\ChecklistTask;
use App\Models\CriticalityAssessment;
use App\Models\Equipment;
use App\Models\MaintenancePlan;
use App\Models\Operator;
use App\Models\PartStock;
use App\Models\User;
use App\Models\Vessel;
use App\Models\VesselIncharge;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * The superadmin's overview.
 *
 * Deliberately not a set of counts. A total tells nobody what to do; what the
 * department needs to know is what is *incomplete* — which vessels have no
 * operator, which equipment has no band, which societies cannot sign in — and
 * which agreements and licences are about to lapse.
 */
class OverviewController extends ApiController
{
    public function show(): JsonResponse
    {
        return $this->ok([
            'readiness' => $this->readiness(),
            'attention' => $this->attention(),
            'operators' => $this->operatorComparison(),
            'totals' => [
                'operators' => Operator::query()->active()->count(),
                'vessels' => Vessel::query()->count(),
                'equipment' => Equipment::query()->count(),
                'plans' => MaintenancePlan::query()->active()->count(),
            ],
        ]);
    }

    /**
     * What is not yet set up. Each entry is a count and the filter that shows
     * it, so the figure is a route to the work rather than a number to note.
     */
    protected function readiness(): array
    {
        $vesselsWithoutOperator = Vessel::query()->whereNull('operator_id')->count();
        $equipmentWithoutBand = Equipment::query()->whereNull('criticality_band')->count();

        $equipmentWithoutPlans = Equipment::query()
            ->whereDoesntHave('maintenancePlans', fn ($q) => $q->where('status', 'active'))
            ->count();

        $operatorsWithoutLogin = Operator::query()
            ->active()
            ->where('type', '!=', 'department')
            ->whereDoesntHave('users')
            ->count();

        $tasksUnused = ChecklistTask::query()
            ->active()
            ->whereDoesntHave('plans')
            ->count();

        $vesselsWithoutIncharge = Vessel::query()
            ->whereNotNull('operator_id')
            ->whereNull('vessel_incharge_id')
            ->count();

        return [
            [
                'key' => 'vessels_without_operator',
                'label' => 'Vessels with no operator',
                'count' => $vesselsWithoutOperator,
                'consequence' => 'Nobody can record work against them.',
                'href' => '/vessels',
            ],
            [
                'key' => 'equipment_without_band',
                'label' => 'Equipment not yet scored',
                'count' => $equipmentWithoutBand,
                'consequence' => 'No strategy can be assigned and nothing can be planned.',
                'href' => '/equipment?awaiting_criticality=1',
            ],
            [
                'key' => 'equipment_without_plans',
                'label' => 'Equipment with no maintenance plans',
                'count' => $equipmentWithoutPlans,
                'consequence' => 'It will never appear as due, whatever its condition.',
                'href' => '/equipment',
            ],
            [
                'key' => 'operators_without_login',
                'label' => 'Operators with no login issued',
                'count' => $operatorsWithoutLogin,
                'consequence' => 'The company cannot sign in at all.',
                'href' => '/operators',
            ],
            [
                'key' => 'vessels_without_incharge',
                'label' => 'Vessels with nobody in charge',
                'count' => $vesselsWithoutIncharge,
                'consequence' => 'No named person against the monthly return.',
                'href' => '/vessels',
            ],
            [
                'key' => 'tasks_unused',
                'label' => 'Library tasks applied to nothing',
                'count' => $tasksUnused,
                'consequence' => 'Written but never used. Either apply them or retire them.',
                'href' => '/task-library',
            ],
        ];
    }

    /** Things that will become problems on a known date. */
    protected function attention(): array
    {
        $soon = Carbon::now()->addDays(90);

        return [
            [
                'key' => 'agreements_expiring',
                'label' => 'Agreements ending within 90 days',
                'count' => Operator::query()
                    ->active()
                    ->whereNotNull('agreement_to')
                    ->whereDate('agreement_to', '<=', $soon->toDateString())
                    ->count(),
                'href' => '/operators',
                'tone' => 'caution',
            ],
            [
                'key' => 'licences_lapsed',
                'label' => 'In-charge licences lapsed',
                'count' => VesselIncharge::query()->withExpiredLicence()->count(),
                'href' => '/incharges',
                'tone' => 'danger',
            ],
            [
                'key' => 'licences_expiring',
                'label' => 'Licences lapsing within 60 days',
                'count' => VesselIncharge::query()->withLicenceExpiringWithin(60)->count(),
                'href' => '/incharges',
                'tone' => 'caution',
            ],
            [
                'key' => 'criticality_pending',
                'label' => 'Criticality assessments awaiting approval',
                'count' => CriticalityAssessment::query()->pending()->count(),
                'href' => '/criticality',
                'tone' => 'caution',
            ],
            [
                'key' => 'stock_below_reorder',
                'label' => 'Stock holdings below reorder level',
                'count' => PartStock::query()->belowReorderLevel()->count(),
                'href' => '/stock',
                'tone' => 'caution',
            ],
        ];
    }

    /**
     * How the operating companies compare.
     *
     * This is what only the department can see, and the reason a central system
     * exists at all: whether one society defers more work than another on
     * comparable vessels.
     */
    protected function operatorComparison(): array
    {
        return Operator::query()
            ->active()
            ->withCount('vessels')
            ->orderBy('name')
            ->get()
            ->map(function (Operator $operator) {
                $equipmentIds = Equipment::query()
                    ->whereHas('vessel', fn ($q) => $q->where('operator_id', $operator->id))
                    ->pluck('id');

                $plans = MaintenancePlan::query()
                    ->whereIn('equipment_id', $equipmentIds)
                    ->active()
                    ->get(['due_status']);

                $orders = WorkOrder::query()
                    ->whereIn('equipment_id', $equipmentIds)
                    ->get(['type', 'status']);

                $unplanned = $orders->where('type', 'breakdown')->count();
                $total = $orders->count();

                return [
                    'id' => $operator->id,
                    'code' => $operator->code,
                    'name' => $operator->name,
                    'type' => $operator->type?->value,
                    'vessels' => $operator->vessels_count,
                    'equipment' => $equipmentIds->count(),
                    'plans' => $plans->count(),
                    'due' => $plans->where('due_status', 'due')->count(),
                    'soon' => $plans->where('due_status', 'due_soon')->count(),
                    'ok' => $plans->where('due_status', 'on_track')->count(),
                    'open_work_orders' => $orders->whereIn('status', ['draft', 'released', 'in_progress'])->count(),
                    // The planned-to-unplanned ratio the PMS logic reports on.
                    // Meaningless until several cycles of history exist, so it
                    // is returned as a count and a total rather than a figure
                    // presented as a finding.
                    'unplanned_jobs' => $unplanned,
                    'total_jobs' => $total,
                    'agreement_to' => $operator->agreement_to?->toDateString(),
                    'users' => User::query()->where('operator_id', $operator->id)->count(),
                ];
            })
            ->values()
            ->all();
    }
}
