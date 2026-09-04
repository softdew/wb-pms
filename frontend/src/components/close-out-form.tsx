'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { completeWorkOrder, type ActionResult } from '@/actions/work-orders';
import type { CodeSets, WorkOrderDetail } from '@/lib/work-orders';

function Submit({ blocked }: { blocked: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || blocked}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0C3040] disabled:opacity-50"
    >
      {pending ? 'Recording…' : 'Complete job'}
    </button>
  );
}

function CodeSelect({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: CodeSets[keyof CodeSets];
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[13px] font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required
        defaultValue=""
        className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
      >
        <option value="" disabled>
          Choose…
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.code}>
            {option.code} — {option.description}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Coded close-out.
 *
 * All four codes are required, downtime is split into planned and unplanned,
 * and free text sits alongside the codes rather than in place of them. Without
 * the codes there is no reliability data to analyse later, which is why the API
 * refuses a close-out that omits any of them.
 */
export function CloseOutForm({
  workOrder,
  codes,
}: {
  workOrder: WorkOrderDetail;
  codes: CodeSets;
}) {
  const complete = completeWorkOrder.bind(null, workOrder.id);
  const [state, action] = useActionState<ActionResult, FormData>(complete, {});

  const outstanding = workOrder.readings.filter((r) => r.is_mandatory && r.value === null).length;

  return (
    <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
      <div className="border-b border-ink-12 px-4.5 py-3">
        <h2 className="font-cond text-[19px] font-semibold text-shoal-ink">Close out</h2>
        <p className="text-[13px] text-ink-45">
          All four codes are required. Notes are recorded in addition to them, not instead.
        </p>
      </div>

      <form action={action} className="space-y-5 px-4.5 py-4">
        {outstanding > 0 ? (
          <p className="rounded-md border border-caution/30 bg-caution-soft px-3 py-2 text-[13px] text-caution">
            {outstanding} mandatory {outstanding === 1 ? 'reading has' : 'readings have'} no value
            yet. Record {outstanding === 1 ? 'it' : 'them'} above before completing.
          </p>
        ) : null}

        {state.error ? (
          <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {state.error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <CodeSelect name="failure_mode" label="Failure mode" options={codes.failure_mode} />
          <CodeSelect name="cause" label="Apparent cause" options={codes.cause} />
          <CodeSelect name="detection_method" label="How it was found" options={codes.detection_method} />
          <CodeSelect name="severity" label="Severity" options={codes.severity} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="planned_downtime_hours" className="mb-1.5 block text-[13px] font-medium">
              Planned downtime, hours
            </label>
            <input
              id="planned_downtime_hours"
              name="planned_downtime_hours"
              type="number"
              step="0.5"
              min="0"
              defaultValue="0"
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>
          <div>
            <label htmlFor="unplanned_downtime_hours" className="mb-1.5 block text-[13px] font-medium">
              Unplanned downtime, hours
            </label>
            <input
              id="unplanned_downtime_hours"
              name="unplanned_downtime_hours"
              type="number"
              step="0.5"
              min="0"
              defaultValue="0"
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>
          <div>
            <label htmlFor="meter_at_completion" className="mb-1.5 block text-[13px] font-medium">
              Meter reading at completion
            </label>
            <input
              id="meter_at_completion"
              name="meter_at_completion"
              type="number"
              step="any"
              min="0"
              placeholder="Hours run"
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
            <p className="mt-1 text-[12px] text-ink-45">
              Needed on a meter-based task, or the next due point cannot be worked out.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="observations" className="mb-1.5 block text-[13px] font-medium">
            Observations
          </label>
          <textarea
            id="observations"
            name="observations"
            rows={3}
            placeholder="What was found, what was done."
            className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="acceptance_criteria_met"
              defaultChecked
              className="h-4 w-4 accent-[#06202C]"
            />
            Acceptance criteria met
          </label>

          <div className="ml-auto">
            <Submit blocked={outstanding > 0} />
          </div>
        </div>
      </form>
    </section>
  );
}
