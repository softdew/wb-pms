'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { assignVessel, type VesselResult } from '@/actions/vessels';
import type { AssignmentPreview } from '@/lib/vessel-types';

function Submit({ transferring }: { transferring: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0C3040] disabled:opacity-50"
    >
      {pending ? 'Recording…' : transferring ? 'Record handover' : 'Assign vessel'}
    </button>
  );
}

/**
 * Assignment and transfer are the same act, differing only in whether someone
 * already holds the vessel.
 *
 * On a transfer the position is shown first — hours, open jobs, overdue tasks —
 * because that is precisely what the outgoing and incoming operators otherwise
 * argue about, and it is fixed at the moment the handover is recorded.
 */
export function AssignForm({ preview }: { preview: AssignmentPreview }) {
  const action = assignVessel.bind(null, preview.vessel.id);
  const [state, formAction] = useActionState<VesselResult, FormData>(action, {});
  const [operatorId, setOperatorId] = useState('');

  const transferring = preview.current_operator !== null;
  const chosen = preview.operators.find((o) => String(o.id) === operatorId);
  const { position } = preview;

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      {transferring ? (
        <section className="overflow-hidden rounded-lg border border-caution/30 bg-caution-soft">
          <div className="border-b border-caution/20 px-5 py-3">
            <h2 className="text-[17px] font-semibold text-caution">
              Handing over from {preview.current_operator!.name}
            </h2>
            <p className="text-[13px] text-ink-70">
              This is the position being handed over. It is recorded as it stands now and
              does not change afterwards. The maintenance history stays with the vessel.
            </p>
          </div>

          <div className="grid gap-5 px-5 py-4 sm:grid-cols-3">
            <div>
              <p className="text-[12.5px] text-ink-45">Open work orders</p>
              <p className="font-cond text-[30px] leading-none font-bold">
                {position.open_work_orders}
              </p>
            </div>
            <div>
              <p className="text-[12.5px] text-ink-45">Overdue tasks</p>
              <p className={`font-cond text-[30px] leading-none font-bold ${position.overdue_tasks > 0 ? 'text-danger' : ''}`}>
                {position.overdue_tasks}
              </p>
            </div>
            <div>
              <p className="text-[12.5px] text-ink-45">Meters recorded</p>
              <p className="font-cond text-[30px] leading-none font-bold">
                {position.meter_readings.length}
              </p>
            </div>
          </div>

          {position.meter_readings.length > 0 ? (
            <div className="border-t border-caution/20 px-5 py-3">
              <p className="mb-1.5 text-[12.5px] font-medium text-ink-70">Readings at handover</p>
              <ul className="space-y-1">
                {position.meter_readings.map((reading) => (
                  <li key={reading.equipment} className="text-[13px] text-ink-70">
                    {reading.name}{' '}
                    <span className="font-cond font-semibold">
                      {reading.reading.toLocaleString('en-IN')}
                    </span>{' '}
                    {reading.meter_type === 'running_hours' ? 'hrs' : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {position.outstanding.length > 0 ? (
            <div className="border-t border-caution/20 px-5 py-3">
              <p className="mb-1.5 text-[12.5px] font-medium text-ink-70">Outstanding jobs</p>
              <ul className="space-y-1">
                {position.outstanding.slice(0, 8).map((job) => (
                  <li key={job.number} className="text-[13px] text-ink-70">
                    <span className="font-cond font-semibold">{job.number}</span>{' '}
                    {job.description}
                  </li>
                ))}
                {position.outstanding.length > 8 ? (
                  <li className="text-[12.5px] text-ink-45">
                    and {position.outstanding.length - 8} more
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">
            {transferring ? 'Taking over' : 'Operator'}
          </h2>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="operator_id" className="mb-1.5 block text-[13px] font-medium">
              Operator<span className="ml-1 text-danger">*</span>
            </label>
            <select
              id="operator_id"
              name="operator_id"
              required
              value={operatorId}
              onChange={(event) => setOperatorId(event.target.value)}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            >
              <option value="">Choose…</option>
              {preview.operators
                .filter((o) => o.id !== preview.vessel.operator_id)
                .map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="assigned_from" className="mb-1.5 block text-[13px] font-medium">
              {transferring ? 'Handed over on' : 'Held from'}
            </label>
            <input
              id="assigned_from"
              name="assigned_from"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>

          <div>
            <label htmlFor="agreement_to" className="mb-1.5 block text-[13px] font-medium">
              Held until
            </label>
            <input
              id="agreement_to"
              name="agreement_to"
              type="date"
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>

          <div>
            <label htmlFor="agreement_no" className="mb-1.5 block text-[13px] font-medium">
              Agreement number
            </label>
            <input
              id="agreement_no"
              name="agreement_no"
              defaultValue={chosen?.agreement_no ?? ''}
              key={`agr-${operatorId}`}
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>

          <div>
            <label htmlFor="tender_reference" className="mb-1.5 block text-[13px] font-medium">
              Tender reference
            </label>
            <input
              id="tender_reference"
              name="tender_reference"
              defaultValue={chosen?.tender_reference ?? ''}
              key={`tnd-${operatorId}`}
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>

          {transferring ? (
            <div className="sm:col-span-2">
              <label htmlFor="condition_notes" className="mb-1.5 block text-[13px] font-medium">
                Condition at handover
              </label>
              <textarea
                id="condition_notes"
                name="condition_notes"
                rows={3}
                placeholder="Hull sound. Starboard gangway damaged."
                className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
              />
              <p className="mt-1 text-[12px] text-ink-45">
                Recorded against the handover and readable by both parties afterwards.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Submit transferring={transferring} />
        <a
          href={`/vessels/${preview.vessel.id}`}
          className="text-[13.5px] text-ink-45 hover:text-ink hover:underline"
        >
          Cancel
        </a>
      </div>

      {transferring ? (
        <p className="text-[13px] text-ink-45">
          The in-charge is cleared on handover. The incoming operator names their own.
        </p>
      ) : null}
    </form>
  );
}
