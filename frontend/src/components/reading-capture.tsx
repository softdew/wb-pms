'use client';

import { useState, useTransition } from 'react';
import { captureReading } from '@/actions/work-orders';
import type { WorkOrderReading } from '@/lib/work-orders';

/**
 * A reading, judged against the limits the task carried when the work order was
 * raised. Out of limits is stated plainly rather than merely coloured, because
 * that is the finding, not a styling detail.
 */
export function ReadingCapture({
  workOrderId,
  reading,
  editable,
}: {
  workOrderId: number;
  reading: WorkOrderReading;
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const limits =
    reading.minimum !== null && reading.maximum !== null
      ? `${reading.minimum} to ${reading.maximum}`
      : reading.minimum !== null
        ? `min ${reading.minimum}`
        : reading.maximum !== null
          ? `max ${reading.maximum}`
          : null;

  return (
    <tr className="border-b border-ink-06 last:border-0">
      <td className="px-3.5 py-2.5 align-baseline">
        <p className="font-medium">{reading.parameter}</p>
        <p className="text-[12.5px] text-ink-45">
          {reading.unit ?? '—'}
          {limits ? ` · ${limits}` : ''}
          {reading.is_mandatory ? '' : ' · optional'}
        </p>
      </td>

      <td className="px-3.5 py-2.5 align-baseline">
        {reading.value !== null ? (
          <>
            <span className="font-cond text-[16px] font-semibold">{reading.value}</span>
            {reading.is_within_limits === false ? (
              <p className="text-[12.5px] font-medium text-danger">Outside acceptance limits</p>
            ) : (
              <p className="text-[12.5px] text-safe">Within limits</p>
            )}
            {reading.observation ? (
              <p className="mt-0.5 text-[12.5px] text-ink-45">{reading.observation}</p>
            ) : null}
          </>
        ) : editable ? (
          <form
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const result = await captureReading(workOrderId, reading.id, formData);
                if (result.error) setError(result.error);
              });
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              name="value"
              type="number"
              step="any"
              required
              aria-label={`Value for ${reading.parameter}`}
              className="w-24 rounded-md border border-ink-22 px-2.5 py-1 text-sm outline-none focus:border-ink-45"
            />
            <input
              name="observation"
              placeholder="Note (optional)"
              aria-label={`Note for ${reading.parameter}`}
              className="w-44 rounded-md border border-ink-22 px-2.5 py-1 text-sm outline-none focus:border-ink-45"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-ink-22 px-3 py-1 text-[13px] font-medium hover:bg-shoal-soft disabled:opacity-50"
            >
              Record
            </button>
            {error ? <span className="text-[12.5px] text-danger">{error}</span> : null}
          </form>
        ) : (
          <span className="text-[13.5px] text-ink-45">Not recorded</span>
        )}
      </td>
    </tr>
  );
}
