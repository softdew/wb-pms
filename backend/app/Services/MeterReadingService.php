<?php

namespace App\Services;

use App\Exceptions\MaintenanceRuleException;
use App\Models\Equipment;
use App\Models\EquipmentMeterReading;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Running-hour capture.
 *
 * Two rules worth stating. A meter does not run backwards, so a lower reading
 * is rejected unless it is declared a reset -- a replaced or rolled-over unit.
 * And readings are never overwritten: the history is what makes "hours since
 * the last overhaul" answerable at all.
 */
class MeterReadingService
{
    public function record(
        Equipment $equipment,
        float $value,
        ?Carbon $readingOn = null,
        ?User $recordedBy = null,
        bool $isReset = false,
        ?string $remarks = null,
    ): EquipmentMeterReading {
        if (! $equipment->isMetered()) {
            throw new MaintenanceRuleException(
                'This asset has no meter defined, so a reading cannot be recorded against it.'
            );
        }

        if ($value < 0) {
            throw new MaintenanceRuleException('A meter reading cannot be negative.');
        }

        $readingOn = $readingOn ?? now();

        if ($readingOn->isFuture()) {
            throw new MaintenanceRuleException('A meter reading cannot be dated in the future.');
        }

        // Compare against the reading that sits immediately before this date,
        // not against the current figure. A back-dated correction is legitimate
        // and must not be judged against readings taken after it.
        $previous = EquipmentMeterReading::query()
            ->where('equipment_id', $equipment->id)
            ->where('reading_on', '<=', $readingOn->toDateString())
            ->orderByDesc('reading_on')
            ->orderByDesc('id')
            ->first();

        $next = EquipmentMeterReading::query()
            ->where('equipment_id', $equipment->id)
            ->where('reading_on', '>', $readingOn->toDateString())
            ->orderBy('reading_on')
            ->orderBy('id')
            ->first();

        if (! $isReset && $previous && $value < (float) $previous->reading_value) {
            throw new MaintenanceRuleException(sprintf(
                'Reading of %s is lower than the reading of %s taken on %s. '
                .'If the meter was replaced or has rolled over, record it as a reset.',
                number_format($value, 2),
                number_format((float) $previous->reading_value, 2),
                $previous->reading_on->format('d/m/Y'),
            ));
        }

        // A back-dated reading higher than one already recorded after it would
        // make the meter appear to run backwards over that interval.
        if (! $isReset && $next && ! $next->is_reset && $value > (float) $next->reading_value) {
            throw new MaintenanceRuleException(sprintf(
                'Reading of %s is higher than the reading of %s already recorded on %s.',
                number_format($value, 2),
                number_format((float) $next->reading_value, 2),
                $next->reading_on->format('d/m/Y'),
            ));
        }

        $previousValue = $previous?->reading_value;

        return DB::transaction(function () use ($equipment, $value, $readingOn, $recordedBy, $isReset, $remarks, $previousValue) {
            $reading = EquipmentMeterReading::create([
                'equipment_id' => $equipment->id,
                'meter_type' => $equipment->meter_type,
                'reading_value' => $value,
                'reading_on' => $readingOn->toDateString(),
                'is_reset' => $isReset,
                'previous_value' => $previousValue,
                'recorded_by' => $recordedBy?->id,
                'remarks' => $remarks,
            ]);

            // Only advance the equipment's current figure if this is the latest
            // reading. Back-dated entries correct the history without rewriting
            // the present.
            if ($equipment->current_meter_reading_on === null
                || $readingOn->gte($equipment->current_meter_reading_on)) {
                $equipment->forceFill([
                    'current_meter_reading' => $value,
                    'current_meter_reading_on' => $readingOn->toDateString(),
                ])->save();
            }

            return $reading;
        });
    }

    /**
     * Hours run between two dates, allowing for resets. Answers the client's
     * "running hours last month" column.
     */
    public function usageBetween(Equipment $equipment, Carbon $from, Carbon $to): float
    {
        $readings = EquipmentMeterReading::query()
            ->where('equipment_id', $equipment->id)
            ->whereBetween('reading_on', [$from->toDateString(), $to->toDateString()])
            ->orderBy('reading_on')
            ->orderBy('id')
            ->get();

        if ($readings->count() < 2) {
            return 0.0;
        }

        $total = 0.0;
        $previous = null;

        foreach ($readings as $reading) {
            if ($previous !== null) {
                // A reset breaks the arithmetic: usage since a replaced meter
                // is whatever the new one shows, not the difference.
                $total += $reading->is_reset
                    ? (float) $reading->reading_value
                    : max(0, (float) $reading->reading_value - (float) $previous->reading_value);
            }

            $previous = $reading;
        }

        return round($total, 2);
    }

    /**
     * Usage since a given reading -- the basis of "hrs since last overhaul" on
     * the client's sheet, where the reading taken at completion is the anchor.
     */
    public function usageSince(Equipment $equipment, float $anchorReading): ?float
    {
        if ($equipment->current_meter_reading === null) {
            return null;
        }

        return round(max(0, (float) $equipment->current_meter_reading - $anchorReading), 2);
    }
}
