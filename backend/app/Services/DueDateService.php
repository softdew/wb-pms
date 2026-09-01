<?php

namespace App\Services;

use App\Enums\DueStatus;
use App\Enums\TriggerClass;
use App\Models\MaintenancePlan;
use App\Models\MaintenanceSetting;
use Illuminate\Support\Carbon;

/**
 * Due points and the three-state indicator.
 *
 * The arithmetic follows the client's own sheet. For a meter-based task:
 *
 *     hrs_since   = current_meter - meter_at_last_completion
 *     hrs_to_next = interval - hrs_since
 *
 * which is why the reading taken at completion is stored on the plan line. A
 * completion date alone cannot answer it.
 */
class DueDateService
{
    /** Recompute the due point and status, and persist both. */
    public function recompute(MaintenancePlan $plan): MaintenancePlan
    {
        $plan->loadMissing('equipment');

        $nextDueOn = null;
        $nextDueMeter = null;

        if ($plan->trigger_class->isAutomatic()) {
            if ($plan->isMeterBased()) {
                $nextDueMeter = $this->nextDueMeterReading($plan);
            } else {
                $nextDueOn = $this->nextDueDate($plan);
            }
        }

        $plan->forceFill([
            'next_due_on' => $nextDueOn?->toDateString(),
            'next_due_meter_reading' => $nextDueMeter,
            'due_status' => $this->status($plan, $nextDueOn, $nextDueMeter),
            'due_status_computed_at' => now(),
        ])->save();

        return $plan->refresh();
    }

    /**
     * Calendar and statutory lines. A task never done is due from the asset's
     * installation date where one is known, otherwise immediately -- which is
     * why the client's own sheet shows short-interval tasks as permanently due
     * when no completion has ever been recorded against them.
     */
    public function nextDueDate(MaintenancePlan $plan): ?Carbon
    {
        $interval = $plan->effectiveIntervalValue();
        $unit = $plan->applicable_interval_unit;

        if ($interval === null || $unit === null || $unit->isMeterBased()) {
            return null;
        }

        $anchor = $plan->last_done_on
            ?? $plan->equipment?->installation_date
            ?? $plan->created_at;

        return $anchor ? $unit->addTo(Carbon::parse($anchor), $interval) : null;
    }

    /** Meter lines: the reading at which the task falls due. */
    public function nextDueMeterReading(MaintenancePlan $plan): ?float
    {
        $interval = $plan->effectiveIntervalValue();

        if ($interval === null) {
            return null;
        }

        // A task never done is measured from zero, matching the client's sheet
        // where an untouched 10-hour task shows the full running total consumed.
        $anchor = $plan->last_done_meter_reading !== null
            ? (float) $plan->last_done_meter_reading
            : 0.0;

        return round($anchor + $interval, 2);
    }

    /** Units consumed since the last completion. */
    public function consumedSinceCompletion(MaintenancePlan $plan): ?float
    {
        if ($plan->isMeterBased()) {
            $current = $plan->equipment?->current_meter_reading;

            if ($current === null) {
                return null;
            }

            $anchor = $plan->last_done_meter_reading !== null
                ? (float) $plan->last_done_meter_reading
                : 0.0;

            return round(max(0, (float) $current - $anchor), 2);
        }

        $anchor = $plan->last_done_on ?? $plan->equipment?->installation_date;

        return $anchor ? (float) Carbon::parse($anchor)->diffInDays(now()) : null;
    }

    /**
     * Units still to run before the task falls due. Negative means overdue --
     * exactly the negative figures in the client's "Hrs to next overhaul"
     * column.
     */
    public function remaining(MaintenancePlan $plan): ?float
    {
        $interval = $plan->effectiveIntervalValue();
        $consumed = $this->consumedSinceCompletion($plan);

        if ($interval === null || $consumed === null) {
            return null;
        }

        if ($plan->isMeterBased()) {
            return round($interval - $consumed, 2);
        }

        // Calendar lines compare in days, so the interval is converted.
        $intervalDays = $plan->applicable_interval_unit?->approximateDays($interval);

        return $intervalDays !== null ? round($intervalDays - $consumed, 2) : null;
    }

    /**
     * ok / soon / due.
     *
     * Amber opens when the remaining figure falls inside an absolute window --
     * 250 running hours or 14 days by default. Absolute rather than
     * proportional because amber means "arrange spares and vessel availability
     * now", and that lead does not scale with the interval: a percentage would
     * put a 10-hour task into amber with two hours left, and a 9,000-hour
     * overhaul into amber for months.
     */
    public function status(MaintenancePlan $plan, ?Carbon $nextDueOn = null, ?float $nextDueMeter = null): DueStatus
    {
        // Condition and event lines have no computable due point; they are
        // raised by a reading breach or by recording the event.
        if (! $plan->trigger_class->isAutomatic()) {
            return DueStatus::OnTrack;
        }

        $remaining = $this->remaining($plan);

        if ($remaining === null) {
            return DueStatus::OnTrack;
        }

        if ($remaining <= 0) {
            return DueStatus::Due;
        }

        return $remaining <= $this->warningWindow($plan)
            ? DueStatus::DueSoon
            : DueStatus::OnTrack;
    }

    /** The date a work order should be released, allowing for lead time. */
    public function releaseOn(MaintenancePlan $plan): ?Carbon
    {
        if ($plan->next_due_on === null) {
            return null;
        }

        $lead = $plan->release_lead_days ?? MaintenanceSetting::current()->default_release_lead_days;

        return Carbon::parse($plan->next_due_on)->subDays($lead);
    }

    /** Whether an extension would breach the statutory outer limit. */
    public function wouldBreachStatutoryLimit(MaintenancePlan $plan, float $proposedInterval): bool
    {
        return $plan->statutory_outer_limit !== null
            && $proposedInterval > (float) $plan->statutory_outer_limit;
    }

    /**
     * A row of the client's monthly return.
     *
     * @return array{interval:?string, consumed:?float, remaining:?float, status:string, next_due:?string}
     */
    public function sheetRow(MaintenancePlan $plan): array
    {
        return [
            'interval' => $plan->intervalLabel(),
            'consumed' => $this->consumedSinceCompletion($plan),
            'remaining' => $this->remaining($plan),
            'status' => $this->status($plan)->sheetLabel(),
            'next_due' => $plan->isMeterBased()
                ? ($plan->next_due_meter_reading !== null ? (string) $plan->next_due_meter_reading : null)
                : $plan->next_due_on?->format('d/m/Y'),
        ];
    }

    /**
     * The amber window, in the units the plan is measured in: hours for a
     * meter line, days for a calendar line.
     */
    protected function warningWindow(MaintenancePlan $plan): float
    {
        if ($plan->warning_window !== null) {
            return (float) $plan->warning_window;
        }

        $settings = MaintenanceSetting::current();

        return $plan->isMeterBased()
            ? (float) $settings->warning_window_hours
            : (float) $settings->warning_window_days;
    }
}
