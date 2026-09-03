import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IntervalBar } from '@/components/interval-bar';
import { ProportionBar } from '@/components/proportion-bar';
import { Sounding, type Tick } from '@/components/sounding';
import { BandBadge, DueBadge, VesselStatusBadge } from '@/components/status';
import { ApiError } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { date, hours } from '@/lib/format';
import { groupSchedule, loadSchedule, loadVessel } from '@/lib/vessel';
import type { PlanWithProgress } from '@/lib/fleet';
import type { DueStatus } from '@/types/api';

function tickFor(plan: PlanWithProgress): Tick {
  const status: DueStatus = plan.due_status ?? 'on_track';
  const interval = plan.interval_value;
  const remaining = plan.remaining;

  const position =
    interval && interval > 0 && remaining !== null
      ? Math.max(-1, Math.min(1, remaining / interval))
      : status === 'due'
        ? -1
        : 1;

  return { position, status, label: `${plan.task?.activity_description ?? 'Task'}` };
}

export default async function VesselPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  let overview;
  try {
    overview = await loadVessel(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { vessel, equipment, totals } = overview;
  const plans = await loadSchedule(vessel.id);
  const groups = groupSchedule(plans, equipment);

  const metered = equipment.filter((item) => item.meter_type);

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/vessels" className="hover:underline">
            Vessels
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          {vessel.code}
        </p>

        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">{vessel.name}</h1>

          <dl className="flex flex-wrap gap-6 pb-1">
            <div>
              <dt className="text-[13px] text-ink-45">Type</dt>
              <dd className="font-medium">{vessel.ship_type?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-45">Operator</dt>
              <dd className="font-medium">
                {vessel.operator?.name ?? <span className="text-caution">Not assigned</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-45">In-charge</dt>
              <dd className="font-medium">
                {vessel.incharge?.name ?? <span className="text-ink-45">Not named</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-45">Registration</dt>
              <dd className="font-medium">{vessel.registration_no ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-45">Status</dt>
              <dd>
                <VesselStatusBadge status={vessel.status} />
              </dd>
            </div>
          </dl>
		  <div className="ml-auto flex gap-2 pb-0.5">
            <Link
              href={`/vessels/${vessel.id}/assign`}
              className="rounded-md border border-ink-22 bg-white px-4 py-2 text-sm font-medium hover:bg-shoal-soft"
            >
              {vessel.operator_id ? 'Transfer' : 'Assign operator'}
            </Link>
            <Link
              href={`/vessels/${vessel.id}/edit`}
              className="rounded-md border border-ink-22 bg-white px-4 py-2 text-sm font-medium hover:bg-shoal-soft"
            >
              Edit
            </Link>
          </div>
        </div>

        <nav className="mt-4 flex gap-0.5" aria-label="Vessel sections">
          {['Schedule', 'Equipment', 'Work orders', 'Operator history'].map((tab, i) => (
            <span
              key={tab}
              className={`px-4 pt-2 pb-2.5 text-sm font-medium ${
                i === 0
                  ? 'border-b-2 border-danger text-ink'
                  : 'border-b-2 border-transparent text-ink-45'
              }`}
            >
              {tab}
            </span>
          ))}
        </nav>
      </header>

      <div className="space-y-5 px-7 py-6">
        {plans.length > 0 ? (
          <Sounding
            ticks={plans.map(tickFor)}
            title={`${vessel.name} sounding`}
            hint="Every planned task on this vessel, by how far through its interval it has run"
          />
        ) : null}

        {/* Running hours read as a strip of figures, not as cards. */}
        {metered.length > 0 ? (
          <section className="flex flex-wrap divide-x divide-ink-12 overflow-hidden rounded-lg border border-ink-12 bg-white">
            {metered.slice(0, 4).map((item) => (
              <div key={item.id} className="min-w-[190px] flex-1 px-5 py-3.5">
                <p className="text-[12.5px] text-ink-45">{item.name}</p>
                <p className="font-cond text-[23px] leading-tight font-semibold">
                  {hours(item.current_meter_reading)}
                  <span className="ml-1 font-sans text-[13px] font-medium text-ink-45">hrs</span>
                </p>
                <p className="text-[12px] text-ink-45">
                  Read {date(item.current_meter_reading_on)}
                </p>
              </div>
            ))}
            <div className="min-w-[190px] flex-1 px-5 py-3.5">
              <p className="text-[12.5px] text-ink-45">Schedule</p>
              <p className="font-cond text-[23px] leading-tight font-semibold">
                {totals.due > 0 ? (
                  <span className="text-danger">{totals.due}</span>
                ) : (
                  <span className="text-safe">0</span>
                )}
                <span className="ml-1 font-sans text-[13px] font-medium text-ink-45">
                  due of {totals.plans}
                </span>
              </p>
              <div className="mt-1.5 max-w-[150px]">
                <ProportionBar due={totals.due} soon={totals.soon} ok={totals.ok} />
              </div>
            </div>
          </section>
        ) : null}

        {groups.length === 0 ? (
          <section className="rounded-lg border border-ink-12 bg-white px-6 py-12 text-center">
            <p className="font-cond text-lg font-semibold">
              {equipment.length === 0
                ? 'No equipment registered on this vessel.'
                : 'No maintenance plans on this equipment.'}
            </p>
            <p className="mt-1 text-sm text-ink-45">
              {equipment.length === 0
                ? 'Register the machinery fitted, then apply the task library to it.'
                : 'Apply the task library for the equipment category to build the schedule.'}
            </p>
          </section>
        ) : (
          groups.map((group) => (
            <section
              key={group.equipmentId}
              className="overflow-hidden rounded-lg border border-ink-12 bg-white"
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-ink-12 px-4.5 py-3">
                <h2 className="text-[17px] font-semibold">{group.equipmentName}</h2>
                <span className="text-[13px] text-ink-45">{group.equipmentCode}</span>
                {group.meterReading ? (
                  <span className="text-[13px] text-ink-45">
                    {hours(group.meterReading)} hrs run
                  </span>
                ) : null}
              </div>

              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    <th className="w-[38%] border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                      Task
                    </th>
                    <th className="border-b border-ink-12 px-3.5 py-2.5 text-right text-[12.5px] font-semibold text-ink-45">
                      Interval
                    </th>
                    <th className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                      Last done
                    </th>
                    <th className="border-b border-ink-12 px-3.5 py-2.5 text-right text-[12.5px] font-semibold text-ink-45">
                      Run since
                    </th>
                    <th className="border-b border-ink-12 px-3.5 py-2.5 text-right text-[12.5px] font-semibold text-ink-45">
                      To next
                    </th>
                    <th className="w-[136px] border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.sections.map((section) => (
                    <Fragment key={`${group.equipmentId}-${section.section}`}>
                      {/* Section bands in chart buff, grouping the way their own sheet does. */}
                      <tr>
                        <td
                          colSpan={6}
                          className="font-cond border-b border-black/[0.08] bg-land px-3.5 py-1.5 text-[13.5px] font-semibold tracking-wide text-[#4A3E1E]"
                        >
                          {section.section}
                        </td>
                      </tr>

                      {section.plans.map((plan) => {
                        const overdue = plan.due_status === 'due';

                        return (
                          <tr
                            key={plan.id}
                            className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft"
                          >
                            <td className="px-3.5 py-2.5 align-baseline">
                              <p className="font-medium">{plan.task?.activity_description}</p>
                              {plan.task?.controlling_reference ? (
                                <p className="text-[12.5px] text-ink-45">
                                  Manual {plan.task.controlling_reference}
                                </p>
                              ) : null}
                            </td>

                            <td className="font-cond px-3.5 py-2.5 text-right align-baseline text-[16px] font-semibold">
                              {plan.interval_label ?? '—'}
                            </td>

                            <td className="px-3.5 py-2.5 align-baseline">
                              {plan.last_done_on ? (
                                <>
                                  <p className="text-[13.5px]">{date(plan.last_done_on)}</p>
                                  {plan.last_done_meter_reading ? (
                                    <p className="text-[12.5px] text-ink-45">
                                      at {hours(plan.last_done_meter_reading)} hrs
                                    </p>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-[13.5px] text-ink-45">Not recorded</span>
                              )}
                            </td>

                            <td className="font-cond px-3.5 py-2.5 text-right align-baseline text-[16px] font-semibold">
                              {hours(plan.consumed)}
                            </td>

                            <td
                              className={`font-cond px-3.5 py-2.5 text-right align-baseline text-[16px] font-semibold ${
                                overdue ? 'text-danger' : ''
                              }`}
                            >
                              {plan.remaining === null
                                ? '—'
                                : plan.remaining < 0
                                  ? `\u2212${hours(Math.abs(plan.remaining))}`
                                  : hours(plan.remaining)}
                            </td>

                            <td className="px-3.5 py-2.5 align-baseline">
                              <DueBadge status={plan.due_status} />
                              <IntervalBar
                                consumed={plan.consumed}
                                interval={plan.interval_value}
                                overdue={overdue}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}

        {equipment.length > 0 ? (
          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <div className="border-b border-ink-12 px-4.5 py-3">
              <h2 className="text-[17px] font-semibold">Equipment fitted</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-shoal-soft">
                  {['Equipment', 'Make and model', 'Criticality', 'Strategy', 'Schedule'].map((h) => (
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
                {equipment.map((item) => (
                  <tr key={item.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                    <td className="px-3.5 py-2.5 align-baseline">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-[12.5px] text-ink-45">
                        {item.code}
                        {item.serial_no ? ` · ${item.serial_no}` : ''}
                      </p>
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {item.make_model ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline">
                      <BandBadge band={item.criticality_band} />
                      {item.hidden_failure_flag ? (
                        <p className="mt-1 text-[12px] text-caution">Hidden failure mode</p>
                      ) : null}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70 capitalize">
                      {item.maintenance_strategy?.replace(/_/g, ' ') ?? (
                        <span className="text-ink-45">Not assigned</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 align-middle">
                      <div className="max-w-[150px]">
                        <ProportionBar due={item.due} soon={item.soon} ok={item.ok} />
                      </div>
                      <p className="mt-1.5 text-[12px] text-ink-45">
                        {item.plans === 0 ? 'No plans' : `${item.plans} tasks`}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>
    </>
  );
}
