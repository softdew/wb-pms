import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IconEquipment, IconOperator, IconWorkOrder } from '@/components/icons';
import { IntervalBar } from '@/components/interval-bar';
import { ProportionBar } from '@/components/proportion-bar';
import { SectionHeader } from '@/components/section-header';
import { Sounding, type Tick } from '@/components/sounding';
import { VesselTabs, type VesselTab } from '@/components/vessel-tabs';
import { BandBadge, DueBadge, VesselStatusBadge } from '@/components/status';
import { ApiError } from '@/lib/api';
import { hasRole, requireUser } from '@/lib/auth';
import { backlogLabel, date, hours } from '@/lib/format';
import {
  groupSchedule,
  loadSchedule,
  loadTenure,
  loadVessel,
  loadVesselWorkOrders,
} from '@/lib/vessel';
import type { PlanWithProgress } from '@/lib/fleet';
import { statusLabel, typeLabel } from '@/lib/work-orders';
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

  return { position, status, label: plan.task?.activity_description ?? 'Task' };
}

const TABS: VesselTab[] = ['schedule', 'equipment', 'work-orders', 'history'];

export default async function VesselPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { tab } = await searchParams;

  const current: VesselTab = TABS.includes(tab as VesselTab) ? (tab as VesselTab) : 'schedule';

  let overview;
  try {
    overview = await loadVessel(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { vessel, equipment, totals } = overview;
  const canManage = hasRole(user, 'department-admin', 'planner');

  // Only fetch what the open tab needs. The schedule is 500 plan lines; there
  // is no reason to load it to look at operator history.
  const plans = current === 'schedule' ? await loadSchedule(vessel.id) : [];
  const workOrders =
    current === 'work-orders' ? await loadVesselWorkOrders(vessel.id).catch(() => null) : null;
  const tenure = current === 'history' ? await loadTenure(vessel.id).catch(() => []) : [];

  const groups = current === 'schedule' ? groupSchedule(plans, equipment) : [];
  const metered = equipment.filter((item) => item.meter_type);

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 shadow-[0_1px_3px_rgba(6,32,44,.05)]">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/vessels" className="hover:underline">
            Vessels
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          {vessel.code}
        </p>

        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <div>
            <h1 className="font-cond text-[34px] leading-none font-bold">{vessel.name}</h1>
            {/* The particulars read as a line, not as five stacked label-value
                pairs competing with the name. */}
            <p className="mt-2 text-[13.5px] text-ink-70">
              {vessel.ship_type?.name ?? 'Type not set'}
              <span className="mx-2 text-ink-22">·</span>
              {vessel.registration_no ?? 'No registration'}
              <span className="mx-2 text-ink-22">·</span>
              <VesselStatusBadge status={vessel.status} />
            </p>
            <p className="mt-1 text-[13.5px] text-ink-70">
              Operated by{' '}
              {vessel.operator ? (
                <Link href={`/operators/${vessel.operator.id}`} className="font-medium hover:underline">
                  {vessel.operator.name}
                </Link>
              ) : (
                <span className="font-medium text-caution">nobody yet</span>
              )}
              <span className="mx-2 text-ink-22">·</span>
              In charge:{' '}
              <span className={vessel.incharge ? 'font-medium' : 'text-ink-45'}>
                {vessel.incharge?.name ?? 'not named'}
              </span>
            </p>
          </div>

          {canManage ? (
            <div className="ml-auto flex gap-2">
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
          ) : null}
        </div>

        <VesselTabs
          vesselId={vessel.id}
          current={current}
          counts={{ equipment: totals.equipment }}
        />
      </header>

      <div className="space-y-6 px-7 py-7">
        {current === 'schedule' ? (
          <>
            {plans.length > 0 ? (
              <Sounding
                ticks={plans.map(tickFor)}
                title={`${vessel.name} sounding`}
                hint="Every planned task on this vessel, by how far through its interval it has run"
              />
            ) : null}

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
                {canManage ? (
                  <Link
                    href={
                      equipment.length === 0
                        ? `/equipment/new?vessel_id=${vessel.id}`
                        : `/equipment/${equipment[0].id}/apply-library`
                    }
                    className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
                  >
                    {equipment.length === 0 ? 'Register equipment' : 'Apply the task library'}
                  </Link>
                ) : null}
              </section>
            ) : (
              groups.map((group) => (
                <section
                  key={group.equipmentId}
                  className="overflow-hidden rounded-lg border border-ink-12 bg-white"
                >
                  <SectionHeader
                    icon={IconEquipment}
                    title={group.equipmentName}
                    hint={
                      group.meterReading
                        ? `${group.equipmentCode} · ${hours(group.meterReading)} hrs run`
                        : group.equipmentCode
                    }
                  />

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
          </>
        ) : null}

        {current === 'equipment' ? (
          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <SectionHeader
              icon={IconEquipment}
              title="Equipment fitted"
              hint={`${equipment.length} ${equipment.length === 1 ? 'item' : 'items'} on the register`}
              action={
                canManage ? (
                  <Link
                    href={`/equipment/new?vessel_id=${vessel.id}`}
                    className="rounded-md bg-ink px-3.5 py-1.5 text-[13.5px] font-medium text-white hover:bg-[#0C3040]"
                  >
                    Register equipment
                  </Link>
                ) : null
              }
            />

            {equipment.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-ink-45">
                Nothing registered against this vessel yet.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    {['Equipment', 'Make and model', 'Meter', 'Criticality', 'Strategy', 'Schedule'].map(
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
                  {equipment.map((item) => (
                    <tr key={item.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                      <td className="px-3.5 py-2.5 align-baseline">
                        <Link href={`/equipment/${item.id}`} className="font-medium hover:underline">
                          {item.name}
                        </Link>
                        <p className="text-[12.5px] text-ink-45">
                          {item.code}
                          {item.serial_no ? ` · ${item.serial_no}` : ''}
                        </p>
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {item.make_model ?? '—'}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {item.meter_type ? (
                          <>
                            <span className="font-cond text-[15px] font-semibold">
                              {hours(item.current_meter_reading)}
                            </span>{' '}
                            hrs
                          </>
                        ) : (
                          <span className="text-ink-45">Not metered</span>
                        )}
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
            )}
          </section>
        ) : null}

        {current === 'work-orders' ? (
          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <SectionHeader
              icon={IconWorkOrder}
              title="Work orders"
              hint={
                workOrders
                  ? `${workOrders.total} raised against this vessel`
                  : 'Unavailable for this account.'
              }
            />

            {!workOrders || workOrders.data.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-ink-45">
                Nothing raised against this vessel yet. Jobs appear when a task falls due,
                or when a breakdown is reported.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    {['Number', 'Job', 'Equipment', 'Due', 'Backlog', 'Status'].map((h) => (
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
                  {workOrders.data.map((order) => {
                    const overdue =
                      order.due_on && new Date(order.due_on) < new Date() && order.status !== 'closed';

                    return (
                      <tr key={order.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                        <td className="px-3.5 py-2.5 align-baseline">
                          <Link
                            href={`/work-orders/${order.id}`}
                            className="font-cond text-[15px] font-semibold hover:underline"
                          >
                            {order.number}
                          </Link>
                          <p className="text-[12px] text-ink-45">
                            {typeLabel[order.type] ?? order.type}
                          </p>
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline font-medium">
                          {order.description}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                          {order.equipment?.name ?? '—'}
                        </td>
                        <td
                          className={`px-3.5 py-2.5 align-baseline text-[13.5px] ${
                            overdue ? 'text-danger' : 'text-ink-70'
                          }`}
                        >
                          {date(order.due_on)}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13px] text-ink-70">
                          {order.backlog_state ? backlogLabel[order.backlog_state] : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13.5px] font-medium">
                          {statusLabel[order.status] ?? order.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        ) : null}

        {current === 'history' ? (
          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <SectionHeader
              icon={IconOperator}
              title="Operator history"
              hint="The department owns the vessel throughout. Only the assignment changes; the maintenance record stays with the boat."
              action={
                canManage ? (
                  <Link
                    href={`/vessels/${vessel.id}/assign`}
                    className="rounded-md border border-ink-22 bg-white px-3.5 py-1.5 text-[13.5px] font-medium hover:bg-shoal-soft"
                  >
                    {vessel.operator_id ? 'Record a transfer' : 'Assign an operator'}
                  </Link>
                ) : null
              }
            />

            {tenure.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-ink-45">
                No operator has been recorded against this vessel yet.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    {['Operator', 'From', 'Until', 'Agreement', 'Tender', 'In charge'].map((h) => (
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
                  {tenure.map((row) => (
                    <tr key={row.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                      <td className="px-3.5 py-2.5 align-baseline">
                        {row.operator ? (
                          <Link
                            href={`/operators/${row.operator.id}`}
                            className="font-medium hover:underline"
                          >
                            {row.operator.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {date(row.assigned_from)}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px]">
                        {row.assigned_until ? (
                          <span className="text-ink-70">{date(row.assigned_until)}</span>
                        ) : (
                          <span className="font-medium text-safe">Current</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {row.agreement_no ?? '—'}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {row.tender_reference ?? '—'}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {row.incharge?.name ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}
