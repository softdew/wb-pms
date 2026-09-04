import Link from 'next/link';
import { BacklogPipeline, type BacklogData } from '@/components/backlog-pipeline';
import { IconVessel } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';
import { FleetHeadline } from '@/components/fleet-headline';
import { OperatorComparison } from '@/components/operator-comparison';
import { ProportionBar } from '@/components/proportion-bar';
import { Sounding } from '@/components/sounding';
import { TodoList } from '@/components/todo-list';
import { get } from '@/lib/api';
import { hasRole, isOperator, requireUser } from '@/lib/auth';
import { loadFleet } from '@/lib/fleet';
import { hours } from '@/lib/format';
import { loadOverview } from '@/lib/overview';
import type { BacklogState } from '@/types/api';

type Backlog = Record<BacklogState, { label: string; count: number; overdue: number }>;

/**
 * Two audiences, one route.
 *
 * The superadmin's question is whether the system is set up and whether the
 * fleet is healthy across operators; a planner's is which tasks are due this
 * week. Same page, one extra section, rather than two dashboards that both get
 * maintained badly.
 *
 * Order matters more than content here: the finding first, then the shape of
 * the backlog, then the work to do about it.
 */
export default async function FleetPage() {
  const user = await requireUser();
  const isSuperadmin = hasRole(user, 'department-admin');
  const operator = isOperator(user);

  const [fleet, backlog, overview] = await Promise.all([
    loadFleet(),
    get<Backlog>('/work-orders/backlog').catch(() => null),
    isSuperadmin ? loadOverview().catch(() => null) : Promise.resolve(null),
  ]);

  const outstanding = overview
    ? overview.readiness.filter((item) => item.count > 0).length +
      overview.attention.filter((item) => item.count > 0).length
    : 0;

  return (
    <div className="space-y-5 px-7 py-6">
      <FleetHeadline
        fleet={fleet}
        totals={overview?.totals}
        organisation={user.organisation?.name}
        outstanding={outstanding}
      />

      {fleet.counts.total > 0 ? (
        <Sounding
          ticks={fleet.ticks}
          title="Fleet sounding"
          hint="Every planned task, placed by how far through its interval it has run"
        />
      ) : null}

      {backlog ? <BacklogPipeline backlog={backlog as BacklogData} /> : null}

      {overview ? (
        <TodoList readiness={overview.readiness} attention={overview.attention} />
      ) : null}

      {overview ? <OperatorComparison operators={overview.operators} /> : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <SectionHeader
          icon={IconVessel}
          title="Vessels"
          hint="Most overdue first"
          action={
            <Link
              href="/vessels"
              className="text-[13px] text-ink-45 hover:text-ink hover:underline"
            >
              Open the register
            </Link>
          }
        />

        {fleet.vessels.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-45">
            No vessels {operator ? 'are assigned to you' : 'in the register'} yet.
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
                            {hours(worst.remaining)} {worst.is_meter_based ? 'hrs' : 'days'} past
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
  );
}
