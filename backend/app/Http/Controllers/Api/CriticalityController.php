<?php

namespace App\Http\Controllers\Api;

use App\Models\CriticalityAssessment;
use App\Models\CriticalityScalePoint;
use App\Models\CriticalitySetting;
use App\Models\Equipment;
use App\Services\CriticalityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Scoring and approval are separate endpoints on purpose. The service refuses
 * an approval by the person who scored it, so the split is enforced rather
 * than merely encouraged by the interface.
 */
class CriticalityController extends ApiController
{
    public function __construct(protected CriticalityService $criticality)
    {
    }

    /**
     * The anchored scales and the band thresholds, for the scoring form.
     *
     * Sent as data rather than hard-coded in the client, because the anchors
     * are the organisation's own words and it may recalibrate them.
     */
    public function scales(): JsonResponse
    {
        $points = CriticalityScalePoint::query()
            ->orderBy('factor')
            ->orderBy('value')
            ->get(['factor', 'value', 'label', 'anchor']);

        $settings = CriticalitySetting::first();

        return $this->ok([
            'factors' => [
                'C' => $points->where('factor', 'C')->values(),
                'E' => $points->where('factor', 'E')->values(),
                'R' => $points->where('factor', 'R')->values(),
            ],
            'thresholds' => [
                'high' => $settings?->high_threshold ?? 30,
                'medium' => $settings?->medium_threshold ?? 12,
            ],
        ]);
    }

    public function pending(): JsonResponse
    {
        return $this->ok(
            CriticalityAssessment::query()
                ->pending()
                ->with([
                    'equipment:id,code,name,vessel_id,criticality_band',
                    'equipment.vessel:id,code,name',
                    'assessor:id,name',
                ])
                ->orderBy('created_at')
                ->paginate(50)
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

    /**
     * Band spread across the register. The High band is normally expected to
     * hold 10 to 20 per cent; a figure far outside that says the anchors need
     * revisiting, not the assets.
     */
    public function distribution(): JsonResponse
    {
        return $this->ok($this->criticality->bandDistribution());
    }

    /** Equipment with no approved band yet — the work still to do. */
    public function unassessed(): JsonResponse
    {
        return $this->ok(
            Equipment::query()
                ->awaitingCriticality()
                ->with(['vessel:id,code,name', 'category:id,code,name'])
                ->orderBy('code')
                ->paginate(50)
        );
    }
}
