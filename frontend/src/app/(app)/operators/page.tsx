import Link from 'next/link';
import { hasRole, requireUser } from '@/lib/auth';
import { date } from '@/lib/format';
import { listOperators, operatorTypeLabel } from '@/lib/operators';

export default async function OperatorsPage() {
  const user = await requireUser();
  const operators = await listOperators();

  const canManage = hasRole(user, 'department-admin');
  const active = operators.data.filter((o) => o.status === 'active');

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">Operators</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">Operating companies</h1>
          <p className="pb-1.5 text-[13px] text-ink-45">
            {active.length} active of {operators.total}
          </p>
          {canManage ? (
            <Link
              href="/operators/new"
              className="ml-auto rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
            >
              Add operator
            </Link>
          ) : null}
        </div>
      </header>

      <div className="px-7 py-7">
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          {operators.data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-cond text-lg font-semibold">No operators yet.</p>
              <p className="mt-1 text-sm text-ink-45">
                Add the cooperative societies and companies that run the vessels, and the
                department&rsquo;s own operation.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-shoal-soft">
                  {['Operator', 'Type', 'Agreement', 'Vessels', 'Logins', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operators.data.map((operator) => {
                  const expiring =
                    operator.agreement_to &&
                    new Date(operator.agreement_to) < new Date(Date.now() + 90 * 86_400_000);

                  return (
                    <tr key={operator.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                      <td className="px-3.5 py-2.5 align-baseline">
                        <Link href={`/operators/${operator.id}`} className="font-medium hover:underline">
                          {operator.name}
                        </Link>
                        <p className="text-[12.5px] text-ink-45">{operator.code}</p>
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {operatorTypeLabel[operator.type]}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {operator.agreement_no ?? '—'}
                        {operator.agreement_to ? (
                          <p className={`text-[12.5px] ${expiring ? 'text-caution' : 'text-ink-45'}`}>
                            until {date(operator.agreement_to)}
                          </p>
                        ) : null}
                      </td>
                      <td className="font-cond px-3.5 py-2.5 align-baseline text-[16px] font-semibold">
                        {operator.vessels_count ?? 0}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px]">
                        {operator.users_count ? (
                          <span className="text-ink-70">{operator.users_count}</span>
                        ) : (
                          <span className="text-caution">None issued</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline">
                        <span
                          className={`text-sm font-medium ${
                            operator.status === 'active' ? 'text-safe' : 'text-ink-45'
                          }`}
                        >
                          {operator.status === 'active' ? 'Active' : 'Ended'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
