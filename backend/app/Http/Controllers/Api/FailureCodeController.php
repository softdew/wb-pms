<?php

namespace App\Http\Controllers\Api;

use App\Models\FailureCode;
use Illuminate\Http\JsonResponse;

/**
 * The four close-out code sets, for populating the close-out form.
 *
 * Returned grouped by type so the form does not have to sort them, and because
 * a close-out that offers the wrong set in a dropdown is worse than one that
 * offers none.
 */
class FailureCodeController extends ApiController
{
    public function index(): JsonResponse
    {
        $codes = FailureCode::query()
            ->where('is_active', true)
            ->orderBy('type')
            ->orderBy('sort_order')
            ->get(['id', 'type', 'code', 'description']);

        return $this->ok([
            'failure_mode' => $codes->where('type', FailureCode::TYPE_FAILURE_MODE)->values(),
            'cause' => $codes->where('type', FailureCode::TYPE_CAUSE)->values(),
            'detection_method' => $codes->where('type', FailureCode::TYPE_DETECTION_METHOD)->values(),
            'severity' => $codes->where('type', FailureCode::TYPE_SEVERITY)->values(),
        ]);
    }
}
