'use client';

import { useState, useTransition } from 'react';
import {
  closeWorkOrder,
  issueParts,
  releaseWorkOrder,
  startWorkOrder,
  type ActionResult,
} from '@/actions/work-orders';

/**
 * The lifecycle buttons. Only the transitions the API will actually accept are
 * offered -- it refuses the rest anyway, and a button that always fails is
 * worse than no button.
 */
export function WorkOrderActions({
  id,
  status,
  hasParts,
  partsIssued,
}: {
  id: number;
  status: string;
  hasParts: boolean;
  partsIssued: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  };

  const button = 'rounded-md px-3.5 py-1.5 text-[13.5px] font-medium transition-colors disabled:opacity-50';
  const solid = `${button} bg-ink text-white hover:bg-[#0C3040]`;
  const plain = `${button} border border-ink-22 bg-white hover:bg-shoal-soft`;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status === 'draft' ? (
          <button className={solid} disabled={pending} onClick={() => run(() => releaseWorkOrder(id))}>
            Release
          </button>
        ) : null}

        {status === 'released' ? (
          <button className={solid} disabled={pending} onClick={() => run(() => startWorkOrder(id))}>
            Start work
          </button>
        ) : null}

        {hasParts && !partsIssued && ['released', 'in_progress'].includes(status) ? (
          <button className={plain} disabled={pending} onClick={() => run(() => issueParts(id))}>
            Issue spares
          </button>
        ) : null}

        {status === 'completed' ? (
          <button className={solid} disabled={pending} onClick={() => run(() => closeWorkOrder(id))}>
            Accept and close
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="max-w-md rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-right text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
