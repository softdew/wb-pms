'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { approveAssessment, rejectAssessment } from '@/actions/criticality';
import type { Assessment } from '@/lib/criticality-types';
import { triggerLabel } from '@/lib/criticality-types';

const bandStyle: Record<string, string> = {
  high: 'border-danger/30 bg-danger-soft text-danger',
  medium: 'border-caution/30 bg-caution-soft text-caution',
  low: 'border-safe/30 bg-safe-soft text-safe',
};

/**
 * One assessment awaiting a decision.
 *
 * The assessor's name is shown because the approver has to be someone else —
 * the API refuses otherwise, and seeing who scored it is how you know before
 * clicking rather than after.
 */
export function ApprovalRow({ assessment }: { assessment: Assessment }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="border-b border-ink-06 px-4.5 py-4 last:border-0">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {assessment.equipment?.name}
            <span className="ml-2 text-[13px] font-normal text-ink-45">
              {assessment.equipment?.code}
              {assessment.equipment?.vessel ? ` · ${assessment.equipment.vessel.name}` : ''}
            </span>
          </p>

          <p className="mt-0.5 text-[13px] text-ink-45">
            Scored by {assessment.assessor?.name ?? 'unknown'}
            {assessment.review_trigger
              ? ` · ${triggerLabel[assessment.review_trigger] ?? assessment.review_trigger}`
              : ''}
          </p>

          {assessment.justification ? (
            <p className="mt-2 border-l-2 border-ink-12 pl-3 text-[13.5px] text-ink-70">
              {assessment.justification}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="font-cond text-[13px] text-ink-45">
              {assessment.consequence_c} × {assessment.exposure_e} × {assessment.redundancy_r}
            </p>
            <p className="font-cond text-[30px] leading-none font-bold">
              {assessment.criticality_index}
            </p>
          </div>

          <span
            className={`rounded border px-2 py-0.5 text-[13px] font-semibold capitalize ${
              bandStyle[assessment.band]
            }`}
          >
            {assessment.band}
          </span>

          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await approveAssessment(assessment.id);
                  if (result.error) setError(result.error);
                });
              }}
              className="rounded-md bg-ink px-3.5 py-1.5 text-[13.5px] font-medium text-white transition-colors hover:bg-[#0C3040] disabled:opacity-50"
            >
              Approve
            </button>
            <button
              disabled={pending}
              onClick={() => setRejecting((open) => !open)}
              className="rounded-md border border-ink-22 bg-white px-3.5 py-1.5 text-[13.5px] font-medium transition-colors hover:bg-shoal-soft disabled:opacity-50"
            >
              Send back
            </button>
          </div>
        </div>
      </div>

      {rejecting ? (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await rejectAssessment(assessment.id, formData);
              if (result.error) setError(result.error);
              else setRejecting(false);
            });
          }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            name="reason"
            required
            placeholder="Why is it going back? The assessor sees this."
            aria-label="Reason for sending back"
            className="min-w-64 flex-1 rounded-md border border-ink-22 px-3 py-1.5 text-sm outline-none focus:border-ink-45"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-ink-22 px-3.5 py-1.5 text-[13.5px] font-medium hover:bg-shoal-soft disabled:opacity-50"
          >
            Send back
          </button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2.5 rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
