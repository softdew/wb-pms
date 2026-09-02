<?php

namespace App\Http\Controllers\Api;

use App\Models\CriticalityAssessment;
use App\Models\Equipment;
use App\Services\CriticalityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Scoring and approval are separate endpoints on purpose. The service refuses
 * an approval by the person who scored it, so the split is enforced rather than
 * merely encouraged by the interface.
 */
class CriticalityController extends ApiController
{
    public function __construct(protected CriticalityService $criticality)
    {
    }

    public function pending(): JsonResponse
    {
        return $this->ok(
            CriticalityAssessment::query()
                ->pending()
                ->with(['equipment:id,code,name', 'assessor:id,name'])
                ->orderBy('created_at')
                ->paginate(25)
        );
    }

    public function history(int $equipmentId): JsonResponse
    {
        return $this->ok(
            Equipment::findOrFail($equipmentId)
                ->criticalityAssessments()
                ->with(['assessor:id,name', 'approver:id,name'])
                ->paginate(25)
        );
    }

    public function score(Request $request, int $equipmentId): JsonResponse
    {
        $data = $request->validate([
            'consequence_c' => ['required', 'integer', 'between:1,5'],
            'exposure_e' => ['required', 'integer', 'between:1,5'],
            'redundancy_r' => ['required', 'integer', 'between:1,3'],
            'justification' => ['nullable', 'string'],
            'review_trigger' => ['nullable', 'in:initial,modification,duty_change,repeated_failure,statutory_change'],
        ]);

        $assessment = $this->criticality->score(
            Equipment::findOrFail($equipmentId),
            $data['consequence_c'],
            $data['exposure_e'],
            $data['redundancy_r'],
            $request->user(),
            $data['justification'] ?? null,
            $data['review_trigger'] ?? CriticalityAssessment::TRIGGER_INITIAL,
        );

        return $this->ok($assessment, 201);
    }

    public function approve(Request $request, int $assessmentId): JsonResponse
    {
        $data = $request->validate(['remarks' => ['nullable', 'string']]);

        return $this->ok($this->criticality->approve(
            CriticalityAssessment::findOrFail($assessmentId),
            $request->user(),
            $data['remarks'] ?? null,
        ));
    }

    public function reject(Request $request, int $assessmentId): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string']]);

        return $this->ok($this->criticality->reject(
            CriticalityAssessment::findOrFail($assessmentId),
            $request->user(),
            $data['reason'],
        ));
    }

    /** Band spread across the register, for calibrating the thresholds. */
    public function distribution(): JsonResponse
    {
        return $this->ok($this->criticality->bandDistribution());
    }
}
