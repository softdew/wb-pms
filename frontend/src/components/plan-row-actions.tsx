'use client';

import { useState, useTransition } from 'react';
import { raiseFromPlan, resumePlan, suspendPlan } from '@/actions/plans';

/**
 * Raising a work order from a plan line is the one action a planner takes here
 * most often, so it sits on the row rather than behind a detail page.
 */
export function PlanRowActions({
  id,
  suspended,
  canManage,
  canRaise,
}: {
  id: number;
  suspended: boolean;
  canManage: boolean;
  canRaise: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (action: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  };

  const button =
    'rounded px-2 py-1 text-[13px] transition-colors disabled:opacity-50';

  return (
    <div className="text-right">
      <div className="flex justify-end gap-1">
        {canRaise && !suspended ? (
          <button
            disabled={pending}
            onClick={() => act(() => raiseFromPlan(id))}
            className={`${button} text-ink-45 hover:bg-ink hover:text-white`}
            title="Raise a work order for this task"
          >
            Raise
          </button>
        ) : null}

        {canManage ? (
          <button
            disabled={pending}
            onClick={() => act(() => (suspended ? resumePlan(id) : suspendPlan(id)))}
            className={`${button} text-ink-45 hover:bg-ink hover:text-white`}
          >
            {suspended ? 'Resume' : 'Suspend'}
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-1 text-[12px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
