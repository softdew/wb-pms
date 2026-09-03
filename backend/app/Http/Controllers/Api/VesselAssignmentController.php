<?php

namespace App\Http\Controllers\Api;

use App\Models\Operator;
use App\Models\Vessel;
use App\Models\VesselIncharge;
use App\Services\VesselTransferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Assigning and transferring a vessel.
 *
 * Deliberately not a field on the vessel form. Who holds a vessel is a dated
 * event with an agreement behind it, and the tenure record is what makes "who
 * ran this boat in March 2027" answerable after a re-tender.
 */
class VesselAssignmentController extends ApiController
{
    public function __construct(protected VesselTransferService $transfers)
    {
    }

    /** Tenure history, most recent first. */
    public function history(int $vesselId): JsonResponse
    {
        return $this->ok($this->transfers->history(Vessel::findOrFail($vesselId)));
    }

    /**
     * What the outgoing operator is handing over: readings, open jobs and
     * overdue tasks as they stand right now. Shown before the transfer is
     * confirmed, because this is the part the two operators argue about.
     */
    public function preview(int $vesselId): JsonResponse
    {
        $vessel = Vessel::with('operator')->findOrFail($vesselId);

        return $this->ok([
            'vessel' => $vessel->only(['id', 'code', 'name', 'operator_id', 'operator_from']),
            'current_operator' => $vessel->operator?->only(['id', 'code', 'name']),
            'position' => $this->transfers->positionSnapshot($vessel),
            'operators' => Operator::query()
                ->active()
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'type', 'agreement_no', 'tender_reference']),
            'incharges' => $vessel->operator_id
                ? VesselIncharge::query()
                    ->where('operator_id', $vessel->operator_id)
                    ->active()
                    ->orderBy('name')
                    ->get(['id', 'name', 'designation', 'licence_no', 'licence_valid_until'])
                : [],
        ]);
    }

    public function store(Request $request, int $vesselId): JsonResponse
    {
        $data = $request->validate([
            'operator_id' => ['required', 'integer', 'exists:operators,id'],
            'assigned_from' => ['nullable', 'date'],
            'agreement_no' => ['nullable', 'string', 'max:64'],
            'tender_reference' => ['nullable', 'string', 'max:64'],
            'agreement_to' => ['nullable', 'date'],
            'condition_notes' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
        ]);

        $vessel = Vessel::findOrFail($vesselId);
        $operator = Operator::findOrFail($data['operator_id']);
        $on = isset($data['assigned_from']) ? Carbon::parse($data['assigned_from']) : now();

        $options = collect($data)->only([
            'agreement_no', 'tender_reference', 'agreement_to', 'condition_notes', 'remarks',
        ])->filter()->all();

        // A vessel with no operator is a first assignment; one that has an
        // operator is a handover, and gets a handover record.
        if ($vessel->operator_id === null) {
            $assignment = $this->transfers->assign($vessel, $operator, $on, $options);

            return $this->ok(['assignment' => $assignment, 'handover' => null], 201);
        }

        $handover = $this->transfers->transfer($vessel, $operator, $on, $options, $request->user());

        return $this->ok([
            'assignment' => $vessel->refresh()->currentAssignment,
            'handover' => $handover,
        ], 201);
    }

    public function assignIncharge(Request $request, int $vesselId): JsonResponse
    {
        $data = $request->validate([
            'vessel_incharge_id' => ['required', 'integer', 'exists:vessel_incharges,id'],
        ]);

        return $this->ok($this->transfers->assignIncharge(
            Vessel::findOrFail($vesselId),
            VesselIncharge::findOrFail($data['vessel_incharge_id']),
        ));
    }
}
