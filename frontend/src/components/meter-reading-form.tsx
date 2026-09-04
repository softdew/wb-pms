'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { recordMeterReading, type EquipmentResult } from '@/actions/equipment';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-ink px-3.5 py-1.5 text-[13.5px] font-medium text-white transition-colors hover:bg-[#0C3040] disabled:opacity-50"
    >
      {pending ? 'Recording…' : 'Record'}
    </button>
  );
}

/**
 * Readings are never edited, only added.
 *
 * A meter that reads lower than the last entry is refused unless it is declared
 * a reset, because a replaced unit and a typo look identical otherwise — and
 * the whole schedule is computed from these figures.
 */
export function MeterReadingForm({
  equipmentId,
  current,
  unit,
}: {
  equipmentId: number;
  current: string | null;
  unit: string;
}) {
  const record = recordMeterReading.bind(null, equipmentId);
  const [state, action] = useActionState<EquipmentResult, FormData>(record, {});
  const [isReset, setIsReset] = useState(false);

  return (
    <form action={action} className="space-y-3">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      {state.ok ? (
        <p className="rounded-md border border-safe/25 bg-safe-soft px-3 py-2 text-[13px] text-safe">
          Reading recorded. Due dates have been recomputed.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-32 flex-1">
          <label htmlFor="reading_value" className="mb-1.5 block text-[12.5px] font-medium">
            Reading, {unit}
          </label>
          <input
            id="reading_value"
            name="reading_value"
            type="number"
            step="any"
            min="0"
            required
            placeholder={current ? String(Number(current)) : '0'}
            className="w-full rounded-md border border-ink-22 px-2.5 py-1.5 text-sm outline-none focus:border-ink-45"
          />
        </div>

        <div>
          <label htmlFor="reading_on" className="mb-1.5 block text-[12.5px] font-medium">
            Taken on
          </label>
          <input
            id="reading_on"
            name="reading_on"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-md border border-ink-22 px-2.5 py-1.5 text-sm outline-none focus:border-ink-45"
          />
        </div>

        <Submit />
      </div>

      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          name="is_reset"
          checked={isReset}
          onChange={(event) => setIsReset(event.target.checked)}
          className="h-4 w-4 accent-[#06202C]"
        />
        The meter was replaced or has rolled over
      </label>

      {isReset ? (
        <div>
          <input
            name="remarks"
            required
            placeholder="Say what happened — this breaks the usage arithmetic."
            aria-label="Reason for the reset"
            className="w-full rounded-md border border-ink-22 px-2.5 py-1.5 text-sm outline-none focus:border-ink-45"
          />
        </div>
      ) : null}
    </form>
  );
}
