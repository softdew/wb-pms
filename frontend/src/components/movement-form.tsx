'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { recordMovement, type PartResult } from '@/actions/parts';
import { SavedNote } from '@/components/saved-note';
import type { OperatorColumn } from '@/lib/part-types';

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

const types = [
  { value: 'receipt', label: 'Received', hint: 'Bought in or returned from a vendor.' },
  { value: 'issue', label: 'Issued', hint: 'Taken out for a job.' },
  { value: 'return', label: 'Returned', hint: 'Came back unused.' },
  { value: 'adjustment', label: 'Adjustment', hint: 'A physical count differed. Needs a reason.' },
];

/**
 * Stock is never edited to a figure; it is moved by an entry.
 *
 * That is what makes the balance rebuildable and an unexplained change
 * impossible — an adjustment carries the only record of why the number changed,
 * so it is required.
 */
export function MovementForm({
  partId,
  operators,
  unit,
  ownOperatorId,
}: {
  partId: number;
  operators: OperatorColumn[];
  unit: string;
  ownOperatorId: number | null;
}) {
  const record = recordMovement.bind(null, partId);
  const [state, action] = useActionState<PartResult, FormData>(record, {});
  const [type, setType] = useState('receipt');
  const form = useRef<HTMLFormElement>(null);

  // Clear the figures after a successful entry, so the same quantity cannot be
  // recorded twice by pressing the button again.
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  const field =
    'w-full rounded-md border border-ink-22 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-ink-45';

  return (
    <form ref={form} action={action} className="space-y-3">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {types.map((option) => (
          <label
            key={option.value}
            className={`cursor-pointer rounded-full border px-3 py-1 text-[13px] transition-colors ${
              type === option.value
                ? 'border-ink bg-ink text-white'
                : 'border-ink-22 hover:bg-shoal-soft'
            }`}
          >
            <input
              type="radio"
              name="type"
              value={option.value}
              checked={type === option.value}
              onChange={() => setType(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>

      <p className="text-[12px] text-ink-45">{types.find((t) => t.value === type)?.hint}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {ownOperatorId ? (
          <input type="hidden" name="operator_id" value={ownOperatorId} />
        ) : (
          <div>
            <label htmlFor="operator_id" className="mb-1 block text-[12.5px] font-medium">
              Whose stock
            </label>
            <select id="operator_id" name="operator_id" required defaultValue="" className={field}>
              <option value="">Choose…</option>
              {operators.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="quantity" className="mb-1 block text-[12.5px] font-medium">
            Quantity, {unit}
          </label>
          <input id="quantity" name="quantity" type="number" step="any" required className={field} />
          {type === 'adjustment' ? (
            <p className="mt-1 text-[12px] text-ink-45">
              Negative to reduce, positive to increase.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="reference_no" className="mb-1 block text-[12.5px] font-medium">
            Reference
          </label>
          <input id="reference_no" name="reference_no" placeholder="Invoice or indent" className={field} />
        </div>

        <div>
          <label htmlFor="remarks" className="mb-1 block text-[12.5px] font-medium">
            {type === 'adjustment' ? 'Reason' : 'Note'}
            {type === 'adjustment' ? <span className="ml-1 text-danger">*</span> : null}
          </label>
          <input
            id="remarks"
            name="remarks"
            required={type === 'adjustment'}
            placeholder={type === 'adjustment' ? 'Physical count variance' : 'Optional'}
            className={field}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Submit />
        <SavedNote on={state.ok ? state : null}>Recorded</SavedNote>
      </div>
    </form>
  );
}
