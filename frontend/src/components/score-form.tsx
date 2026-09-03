'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { scoreEquipment, type ActionResult } from '@/actions/criticality';
import { triggerLabel } from '@/lib/criticality-types';
import type { Scales, ScalePoint } from '@/lib/criticality-types';

function bandFor(index: number, thresholds: { high: number; medium: number }) {
  if (index >= thresholds.high) return { band: 'High', tone: 'text-danger', soft: 'bg-danger-soft' };
  if (index >= thresholds.medium) return { band: 'Medium', tone: 'text-caution', soft: 'bg-caution-soft' };

  return { band: 'Low', tone: 'text-safe', soft: 'bg-safe-soft' };
}

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0C3040] disabled:opacity-50"
    >
      {pending ? 'Submitting…' : 'Submit for approval'}
    </button>
  );
}

/**
 * The anchors are the point.
 *
 * A number between 1 and 5 means nothing on its own; the organisation's own
 * wording for each step is what makes two assessors score the same asset the
 * same way. So the anchors are shown in full, not hidden behind a tooltip.
 */
function Factor({
  name,
  title,
  question,
  points,
  value,
  onChange,
}: {
  name: string;
  title: string;
  question: string;
  points: ScalePoint[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className="border-t border-ink-12 pt-4 first:border-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <p className="font-cond text-[16px] font-semibold">{title}</p>
      <p className="mb-2.5 text-[13px] text-ink-45">{question}</p>

      <div className="space-y-1.5">
        {points.map((point) => {
          const selected = value === point.value;

          return (
            <label
              key={point.value}
              className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2 transition-colors ${
                selected
                  ? 'border-ink bg-shoal-soft'
                  : 'border-ink-12 hover:border-ink-22 hover:bg-shoal-soft/60'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={point.value}
                checked={selected}
                onChange={() => onChange(point.value)}
                className="sr-only"
              />
              <span
                className={`font-cond flex h-6 w-6 shrink-0 items-center justify-center rounded text-[14px] font-bold ${
                  selected ? 'bg-ink text-white' : 'bg-ink-06 text-ink-45'
                }`}
                aria-hidden
              >
                {point.value}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium">{point.label}</span>
                {point.anchor ? (
                  <span className="block text-[12.5px] text-ink-45">{point.anchor}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ScoreForm({
  equipmentId,
  equipmentName,
  scales,
  isReassessment,
}: {
  equipmentId: number;
  equipmentName: string;
  scales: Scales;
  isReassessment: boolean;
}) {
  const score = scoreEquipment.bind(null, equipmentId);
  const [state, action] = useActionState<ActionResult, FormData>(score, {});

  const [c, setC] = useState(0);
  const [e, setE] = useState(0);
  const [r, setR] = useState(0);

  const complete = c > 0 && e > 0 && r > 0;
  const index = c * e * r;
  const result = bandFor(index, scales.thresholds);

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <section className="space-y-5 overflow-hidden rounded-lg border border-ink-12 bg-white px-5 py-5">
        {state.error ? (
          <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {state.error}
          </p>
        ) : null}

        <Factor
          name="consequence_c"
          title="Consequence"
          question="If this fails, what happens?"
          points={scales.factors.C}
          value={c}
          onChange={setC}
        />
        <Factor
          name="exposure_e"
          title="Exposure"
          question="How hard is it worked?"
          points={scales.factors.E}
          value={e}
          onChange={setE}
        />
        <Factor
          name="redundancy_r"
          title="Redundancy"
          question="What happens if it is unavailable?"
          points={scales.factors.R}
          value={r}
          onChange={setR}
        />

        <div className="border-t border-ink-12 pt-4">
          <label htmlFor="justification" className="mb-1.5 block text-[13px] font-medium">
            Justification
          </label>
          <textarea
            id="justification"
            name="justification"
            rows={3}
            placeholder="Why these scores. Read by whoever approves it."
            className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
          />
        </div>

        {isReassessment ? (
          <div>
            <label htmlFor="review_trigger" className="mb-1.5 block text-[13px] font-medium">
              Why is this being reassessed?
            </label>
            <select
              id="review_trigger"
              name="review_trigger"
              defaultValue="modification"
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            >
              {Object.entries(triggerLabel)
                .filter(([key]) => key !== 'initial')
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="review_trigger" value="initial" />
        )}
      </section>

      <aside className="space-y-4">
        <div className="sticky top-5 overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="border-b border-ink-12 px-4 py-2.5">
            <h2 className="text-[15px] font-semibold">Index</h2>
            <p className="text-[12.5px] text-ink-45">{equipmentName}</p>
          </div>

          <div className="px-4 py-4">
            <p className="font-cond flex items-baseline gap-1.5 text-[15px] text-ink-45">
              <span className={c ? 'font-bold text-ink' : ''}>{c || '—'}</span>
              <span>×</span>
              <span className={e ? 'font-bold text-ink' : ''}>{e || '—'}</span>
              <span>×</span>
              <span className={r ? 'font-bold text-ink' : ''}>{r || '—'}</span>
            </p>

            <p className="font-cond mt-1 text-[52px] leading-none font-bold tracking-tight">
              {complete ? index : '—'}
            </p>

            {complete ? (
              <p className={`mt-2 inline-block rounded px-2 py-0.5 text-[13px] font-semibold ${result.soft} ${result.tone}`}>
                {result.band} band
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-ink-45">Score all three factors.</p>
            )}

            <p className="mt-3 text-[12.5px] text-ink-45">
              High at {scales.thresholds.high} and above, Medium from{' '}
              {scales.thresholds.medium}, Low below that. The index is computed, never
              typed.
            </p>
          </div>

          <div className="border-t border-ink-12 px-4 py-3">
            <Submit />
            <p className="mt-2 text-[12px] text-ink-45">
              Goes to the technical authority. Whoever scores it cannot approve it.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
