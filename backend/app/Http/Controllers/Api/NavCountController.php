<?php

namespace App\Http\Controllers\Api;

use App\Models\MaintenancePlan;
use App\Models\PartStock;
use App\Models\Vessel;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;

/**
 * The badges beside the navigation, in one request.
 *
 * These were four separate calls returning a single number each. On a
 * single-threaded dev server that is four queued round trips before the page
 * shell can paint, for information that is decorative.
 */
class NavCountController extends ApiController
{
    public function index(): JsonResponse
    {
        return $this->ok([
            'workOrders' => WorkOrder::query()->open()->count(),
            'overdue' => MaintenancePlan::query()->active()->due()->count(),
            'vessels' => Vessel::query()->count(),
            'plans' => MaintenancePlan::query()->active()->count(),
            'belowReorder' => PartStock::query()->belowReorderLevel()->count(),
        ]);
    }
}
