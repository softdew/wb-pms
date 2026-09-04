'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  issueOperatorLogin,
  reinstateOperator,
  suspendOperator,
  type OperatorResult,
} from '@/actions/operators';
import { CredentialsPanel } from '@/components/credentials-panel';
import type { Operator } from '@/lib/operator-types';

/**
 * Suspending withdraws access without deleting anything: the vessels held, the
 * work recorded and the stock on hand all stay where they are. That is the
 * point of ending an agreement rather than removing a company.
 */
export function OperatorAdmin({
  operator,
  hasLogin,
}: {
  operator: Operator;
  hasLogin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const issue = issueOperatorLogin.bind(null, operator.id);
  const [loginState, loginAction] = useActionState<OperatorResult, FormData>(issue, {});

  const suspended = operator.status !== 'active';
  const isDepartment = operator.type === 'department';

  if (loginState.credentials) {
    return (
      <CredentialsPanel
        email={loginState.credentials.email}
        password={loginState.credentials.password}
        operatorName={operator.name}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
      <div className="border-b border-ink-12 px-5 py-3">
        <h2 className="font-cond text-[19px] font-semibold text-shoal-ink">Administration</h2>
      </div>

      <div className="space-y-4 px-5 py-4">
        {error ?? loginState.error ? (
          <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {error ?? loginState.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium">
              {suspended ? 'Access withdrawn' : 'Access active'}
            </p>
            <p className="text-[12.5px] text-ink-45">
              {suspended
                ? 'The login is refused at sign-in. Records and vessels are untouched.'
                : 'The company can sign in and record work against its vessels.'}
            </p>
          </div>

          {!isDepartment ? (
            <button
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = suspended
                    ? await reinstateOperator(operator.id)
                    : await suspendOperator(operator.id);
                  if (result.error) setError(result.error);
                });
              }}
              className="rounded-md border border-ink-22 px-3.5 py-1.5 text-[13.5px] font-medium hover:bg-shoal-soft disabled:opacity-50"
            >
              {suspended ? 'Reinstate' : 'Withdraw access'}
            </button>
          ) : null}
        </div>

        {!isDepartment ? (
          <div className="border-t border-ink-12 pt-4">
            {hasLogin && !issuing ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">Login issued</p>
                  <p className="text-[12.5px] text-ink-45">
                    One account per company. A second can be issued if needed.
                  </p>
                </div>
                <button
                  onClick={() => setIssuing(true)}
                  className="rounded-md border border-ink-22 px-3.5 py-1.5 text-[13.5px] font-medium hover:bg-shoal-soft"
                >
                  Issue another
                </button>
              </div>
            ) : issuing || !hasLogin ? (
              <form action={loginAction} className="space-y-3">
                <p className="text-[13.5px] font-medium">
                  {hasLogin ? 'Issue another login' : 'No login yet'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="office@society.example"
                    aria-label="Email address"
                    className="min-w-56 flex-1 rounded-md border border-ink-22 px-3 py-1.5 text-sm outline-none focus:border-ink-45"
                  />
                  <input
                    name="password"
                    placeholder="Password (generated if blank)"
                    aria-label="Password"
                    className="min-w-56 flex-1 rounded-md border border-ink-22 px-3 py-1.5 text-sm outline-none focus:border-ink-45"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-ink px-3.5 py-1.5 text-[13.5px] font-medium text-white hover:bg-[#0C3040]"
                  >
                    Issue login
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
