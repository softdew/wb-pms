import Link from 'next/link';
import { IconOperator } from '@/components/icons';
import { ProportionBar } from '@/components/proportion-bar';
import { SectionHeader } from '@/components/section-header';
import { date } from '@/lib/format';
import type { OperatorRow } from '@/lib/overview';

/**
 * How the operating companies compare.
 *
 * This is the view only the department has, and the reason a central system
 * exists at all. It is deliberately plain: comparing contractors is sensitive,
 * and the figures should read as facts rather than as a ranking with a winner.
 */
export function OperatorComparison({ operators }: { operators: OperatorRow[] }) {
  if (operators.length === 0) {
    return (
      <section className="rounded-lg border border-ink-12 bg-white px-6 py-10 text-center">
        <p className="font-cond text-lg font-semibold">No operators yet.</p>
        <p className="mt-1 text-sm text-ink-45">
          Add the societies and companies running the vessels, and the department&rsquo;s
          own operation.
        </p>
        <Link
          href="/operators/new"
          className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
        >
          Add an operator
        </Link>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
      <SectionHeader
        icon={IconOperator}
        title="Across the operators"
        hint={
          operators.length === 1
            ? 'Comparison becomes useful once a second operator is running vessels.'
            : 'Same measures, whoever holds the vessel'
        }
      />

      <table className="w-full">
        <thead>
          <tr className="bg-shoal-soft">
            {['Operator', 'Vessels', 'Schedule', 'Overdue', 'Open jobs', 'Unplanned', 'Agreement'].map(
              (h) => (
                <th
                  key={h}
                  className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {operators.map((operator) => {
            const expiring =
              operator.agreement_to &&
              new Date(operator.agreement_to) < new Date(Date.now() + 90 * 86_400_000);

            return (
              <tr key={operator.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                <td className="px-3.5 py-3 align-baseline">
                  <Link href={`/operators/${operator.id}`} className="font-medium hover:underline">
                    {operator.name}
                  </Link>
                  <p className="text-[12.5px] text-ink-45">
                    {operator.equipment} items
                    {operator.users === 0 ? (
                      <span className="text-caution"> · no login</span>
                    ) : null}
                  </p>
                </td>

                <td className="font-cond px-3.5 py-3 align-baseline text-[17px] font-semibold">
                  {operator.vessels}
                </td>

                <td className="px-3.5 py-3 align-middle">
                  <div className="max-w-[130px]">
                    <ProportionBar due={operator.due} soon={operator.soon} ok={operator.ok} />
                  </div>
                  <p className="mt-1.5 text-[12px] text-ink-45">
                    {operator.plans === 0 ? 'No plans' : `${operator.plans} tasks`}
                  </p>
                </td>

                <td className="px-3.5 py-3 align-baseline">
                  <span
                    className={`font-cond text-[19px] font-semibold ${
                      operator.due > 0 ? 'text-danger' : 'text-ink-45'
                    }`}
                  >
                    {operator.due || '—'}
                  </span>
                </td>

                <td className="font-cond px-3.5 py-3 align-baseline text-[17px] font-semibold">
                  {operator.open_work_orders || <span className="text-ink-45">—</span>}
                </td>

                <td className="px-3.5 py-3 align-baseline text-[13.5px]">
                  {operator.total_jobs === 0 ? (
                    <span className="text-ink-45">No history</span>
                  ) : (
                    <>
                      <span className="font-cond text-[16px] font-semibold">
                        {operator.unplanned_jobs}
                      </span>
                      <span className="text-ink-45"> of {operator.total_jobs}</span>
                    </>
                  )}
                </td>

                <td className={`px-3.5 py-3 align-baseline text-[13px] ${expiring ? 'text-caution' : 'text-ink-70'}`}>
                  {operator.agreement_to ? date(operator.agreement_to) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="border-t border-ink-12 px-5 py-2.5 text-[12.5px] text-ink-45">
        Unplanned counts breakdown jobs against all jobs raised. It only means anything
        once several maintenance cycles of coded history exist.
      </p>
    </section>
  );
}
