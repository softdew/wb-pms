import Link from 'next/link';
import { ProportionBar } from '@/components/proportion-bar';
import { Sounding } from '@/components/sounding';
import { get } from '@/lib/api';
import { isOperator, requireUser } from '@/lib/auth';
import { loadFleet } from '@/lib/fleet';
import { backlogLabel, hours } from '@/lib/format';
import type { BacklogState } from '@/types/api';

type Backlog = Record<BacklogState, { label: string; count: number; overdue: number }>;

export default async function FleetPage() {
  const user = await requireUser();
  const [fleet, backlog] = await Promise.all([
    loadFleet(),
    get<Backlog>('/work-orders/backlog').catch(() => null),
  ]);

  const operator = isOperator(user);

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">{user.organisation?.name}</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">
            {operator ? 'Our fleet' : 'Fleet status'}
          </h1>
          <p className="pb-1.5 text-[13px] text-ink-45">
            {fleet.vessels.length} vessels · {fleet.counts.total} planned tasks
            {fleet.unassigned > 0 && !operator ? (
              <span className="text-caution"> · {fleet.unassigned} not assigned to an operator</span>
            ) : null}
          </p>
        </div>
      </header>

      <div className="space-y-5 px-7 py-6">
        {fleet.counts.total > 0 ? (
          <Sounding
            ticks={fleet.ticks}
            title="Fleet sounding"
            hint="Every planned task, placed by how far through its interval it has run"
          />
        ) : (
          <section className="rounded-lg border border-ink-12 bg-white px-6 py-10 text-center">
            <p className="font-cond text-lg font-semibold">No maintenance plans yet.</p>
            <p className="mt-1 text-sm text-ink-45">
              Register equipment against a vessel, then apply the task library to it.
            </p>
          </section>
        )}

        {/* Backlog reads as one line of three figures, not three cards. */}
        {backlog ? (
          <section className="flex flex-wrap divide-x divide-ink-12 overflow-hidden rounded-lg border border-ink-12 bg-white">
            {(Object.keys(backlogLabel) as BacklogState[]).map((state) => (
              <div key={state} className="min-w-[200px] flex-1 px-5 py-3.5">
                <p className="text-[12.5px] text-ink-45">{backlogLabel[state]}</p>
                <p className="font-cond text-[23px] leading-tight font-semibold">
                  {backlog[state]?.count ?? 0}
                  {backlog[state]?.overdue ? (
                    <span className="ml-2 font-sans text-[12.5px] font-medium text-danger">
                      {backlog[state].overdue} past due
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="flex items-center gap-3 border-b border-ink-12 px-4.5 py-3">
            <h2 className="text-[17px] font-semibold">Vessels</h2>
            <p className="text-[13px] text-ink-45">Most overdue first</p>
            <Link href="/vessels" className="ml-auto text-[13px] text-ink-45 hover:text-ink hover:underline">
              Open the register
            </Link>
          </div>

          {fleet.vessels.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-45">
              No vessels are assigned to you yet.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-shoal-soft">
                  <th className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                    Vessel
                  </th>
                  {!operator ? (
                    <th className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                      Operator
                    </th>
                  ) : null}
                  <th className="w-[190px] border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                    Schedule
                  </th>
                  <th className="border-b border-ink-12 px-3.5 py-2.5 text-right text-[12.5px] font-semibold text-ink-45">
                    Due
                  </th>
                  <th className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                    Needs attention
                  </th>
                </tr>
              </thead>
              <tbody>
                {fleet.vessels.map(({ vessel, due, soon, ok, total, worst }) => (
                  <tr key={vessel.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                    <td className="px-3.5 py-3 align-baseline">
                      <Link href={`/vessels/${vessel.id}`} className="font-medium hover:underline">
                        {vessel.name}
                      </Link>
                      <p className="text-[12.5px] text-ink-45">{vessel.code}</p>
                    </td>

                    {!operator ? (
                      <td className="px-3.5 py-3 align-baseline text-[13.5px] text-ink-70">
                        {vessel.operator?.name ?? <span className="text-caution">Not assigned</span>}
                      </td>
                    ) : null}

                    <td className="px-3.5 py-3 align-middle">
                      <ProportionBar due={due} soon={soon} ok={ok} />
                      <p className="mt-1.5 text-[12px] text-ink-45">
                        {total === 0 ? 'No plans' : `${total} tasks`}
                      </p>
                    </td>

                    <td className="px-3.5 py-3 text-right align-baseline">
                      <span
                        className={`font-cond text-[19px] font-semibold ${
                          due > 0 ? 'text-danger' : soon > 0 ? 'text-caution' : 'text-ink-45'
                        }`}
                      >
                        {due || (soon ? soon : '—')}
                      </span>
                      {soon > 0 && due > 0 ? (
                        <span className="ml-1.5 text-[12px] text-caution">+{soon} soon</span>
                      ) : null}
                    </td>

                    <td className="px-3.5 py-3 align-baseline">
                      {worst ? (
                        <>
                          <p className="text-[13.5px]">{worst.task?.activity_description}</p>
                          <p className="text-[12.5px] text-ink-45">
                            {worst.equipment?.name} ·{' '}
                            <span className="text-danger">
                              {hours(worst.remaining)}{' '}
                              {worst.is_meter_based ? 'hrs' : 'days'} past
                            </span>
                          </p>
                        </>
                      ) : (
                        <span className="text-[13.5px] text-ink-45">Nothing overdue</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
