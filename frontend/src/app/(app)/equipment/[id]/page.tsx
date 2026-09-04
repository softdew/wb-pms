import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IntervalBar } from '@/components/interval-bar';
import { MeterReadingForm } from '@/components/meter-reading-form';
import { ProportionBar } from '@/components/proportion-bar';
import { Sounding, type Tick } from '@/components/sounding';
import { BandBadge, DueBadge } from '@/components/status';
import { ApiError, get } from '@/lib/api';
import { hasRole, requireUser } from '@/lib/auth';
import { date, hours } from '@/lib/format';
import type { PlanWithProgress } from '@/lib/fleet';
import type { DueStatus } from '@/types/api';

interface Detail {
  equipment: {
    id: number;
    code: string;
    name: string;
    serial_no: string | null;
    criticality_band: string | null;
    criticality_index: number | null;
    maintenance_strategy: string | null;
    hidden_failure_flag: boolean;
    meter_type: string | null;
    current_meter_reading: string | null;
    current_meter_reading_on: string | null;
    installation_date: string | null;
    warranty_expiry_date: string | null;
    statutory_item_ref: string | null;
    replacement_value: string | null;
    duty_status: string | null;
    vessel?: { id: number; code: string; name: string; operator?: { id: number; name: string } | null } | null;
    location?: { id: number; code: string; name: string } | null;
    category?: { id: number; code: string; name: string } | null;
    model?: { id: number; make: string; model: string; oem: string | null } | null;
    parent?: { id: number; code: string; name: string } | null;
  };
  plans: PlanWithProgress[];
  readings: {
    id: number;
    reading_value: string;
    reading_on: string;
    is_reset: boolean;
    remarks: string | null;
  }[];
  work_orders: {
    id: number;
    number: string;
    description: string;
    status: string;
    due_on: string | null;
  }[];
  children: { id: number; code: string; name: string; criticality_band: string | null }[];
  totals: { plans: number; due: number; soon: number; ok: number };
}

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

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  let detail: Detail;
  try {
    detail = await get<Detail>(`/equipment/${id}/detail`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { equipment, plans, readings, work_orders, children, totals } = detail;
  const canManage = hasRole(user, 'department-admin', 'planner');
  const canRecord = hasRole(user, 'department-admin', 'planner', 'supervisor', 'operator');

  const unit = equipment.meter_type === 'running_hours' ? 'hrs' : equipment.meter_type ?? '';
  const sections = plans.reduce<Record<string, PlanWithProgress[]>>((acc, plan) => {
    const key = plan.task?.section ?? 'Other tasks';
    acc[key] = [...(acc[key] ?? []), plan];

    return acc;
  }, {});

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/equipment" className="hover:underline">
            Equipment
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          {equipment.vessel ? (
            <>
              <Link href={`/vessels/${equipment.vessel.id}`} className="hover:underline">
                {equipment.vessel.name}
              </Link>
              <span className="mx-1.5 text-ink-22">/</span>
            </>
          ) : null}
          {equipment.code}
        </p>

        <div className="flex flex-wrap items-end gap-6">
          <div>
            <h1 className="text-[29px] leading-tight font-semibold">{equipment.name}</h1>
            <p className="mt-1 text-[13.5px] text-ink-45">
              {equipment.parent ? `Part of ${equipment.parent.name} · ` : ''}
              {equipment.model ? `${equipment.model.make} ${equipment.model.model}` : 'Model not set'}
              {equipment.serial_no ? ` · ${equipment.serial_no}` : ''}
            </p>
          </div>

          <dl className="flex flex-wrap gap-6 pb-1">
            <div>
              <dt className="text-[13px] text-ink-45">Criticality</dt>
              <dd>
                <BandBadge band={equipment.criticality_band as never} />
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-45">Strategy</dt>
              <dd className="font-medium capitalize">
                {equipment.maintenance_strategy?.replace(/_/g, ' ') ?? (
                  <span className="text-ink-45">Not assigned</span>
                )}
              </dd>
            </div>
            {equipment.vessel?.operator ? (
              <div>
                <dt className="text-[13px] text-ink-45">Operated by</dt>
                <dd className="font-medium">{equipment.vessel.operator.name}</dd>
              </div>
            ) : null}
          </dl>

          {canManage ? (
            <div className="ml-auto flex gap-2 pb-0.5">
              <Link
                href={`/equipment/${equipment.id}/apply-library`}
                className="rounded-md border border-ink-22 bg-white px-4 py-2 text-sm font-medium hover:bg-shoal-soft"
              >
                Apply task library
              </Link>
              <Link
                href={`/equipment/${equipment.id}/criticality`}
                className="rounded-md border border-ink-22 bg-white px-4 py-2 text-sm font-medium hover:bg-shoal-soft"
              >
                {equipment.criticality_band ? 'Reassess' : 'Score criticality'}
              </Link>
              <Link
                href={`/equipment/${equipment.id}/edit`}
                className="rounded-md border border-ink-22 bg-white px-4 py-2 text-sm font-medium hover:bg-shoal-soft"
              >
                Edit
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <div className="space-y-5 px-7 py-6">
        {equipment.hidden_failure_flag ? (
          <p className="rounded-md border border-caution/30 bg-caution-soft px-4 py-3 text-[13.5px] text-caution">
            Failure would not be evident in normal operation. This item can never be run
            to failure, and its interval can never be extended.
          </p>
        ) : null}

        {plans.length > 0 ? (
          <Sounding
            ticks={plans.map(tickFor)}
            title="Sounding"
            hint="Every planned task on this item, by how far through its interval it has run"
          />
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {plans.length === 0 ? (
              <section className="rounded-lg border border-ink-12 bg-white px-6 py-12 text-center">
                <p className="font-cond text-lg font-semibold">No maintenance plans yet.</p>
                <p className="mt-1 text-sm text-ink-45">
                  {equipment.criticality_band
                    ? 'Apply the task library for its category to build the schedule.'
                    : 'Score its criticality first, then apply the task library.'}
                </p>
                {canManage ? (
                  <Link
                    href={
                      equipment.criticality_band
                        ? `/equipment/${equipment.id}/apply-library`
                        : `/equipment/${equipment.id}/criticality`
                    }
                    className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
                  >
                    {equipment.criticality_band ? 'Apply task library' : 'Score criticality'}
                  </Link>
                ) : null}
              </section>
            ) : (
              <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
                <div className="flex flex-wrap items-baseline gap-3 border-b border-ink-12 px-5 py-3">
                  <h2 className="text-[17px] font-semibold">Schedule</h2>
                  <p className="text-[13px] text-ink-45">{totals.plans} tasks</p>
                  <div className="ml-auto w-40">
                    <ProportionBar due={totals.due} soon={totals.soon} ok={totals.ok} />
                  </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="bg-shoal-soft">
                      <th className="w-[40%] border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                        Task
                      </th>
                      <th className="border-b border-ink-12 px-3.5 py-2.5 text-right text-[12.5px] font-semibold text-ink-45">
                        Interval
                      </th>
                      <th className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                        Last done
                      </th>
                      <th className="border-b border-ink-12 px-3.5 py-2.5 text-right text-[12.5px] font-semibold text-ink-45">
                        To next
                      </th>
                      <th className="w-[132px] border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sections).map(([section, list]) => (
                      <Fragment key={section}>
                        <tr>
                          <td
                            colSpan={5}
                            className="font-cond border-b border-black/[0.08] bg-land px-3.5 py-1.5 text-[13.5px] font-semibold tracking-wide text-[#4A3E1E]"
                          >
                            {section}
                          </td>
                        </tr>

                        {list.map((plan) => {
                          const overdue = plan.due_status === 'due';

                          return (
                            <tr key={plan.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                              <td className="px-3.5 py-2.5 align-baseline">
                                <p className="font-medium">{plan.task?.activity_description}</p>
                                {plan.task?.controlling_reference ? (
                                  <p className="text-[12.5px] text-ink-45">
                                    Manual {plan.task.controlling_reference}
                                  </p>
                                ) : null}
                              </td>
                              <td className="font-cond px-3.5 py-2.5 text-right align-baseline text-[15px] font-semibold">
                                {plan.interval_label ?? '—'}
                              </td>
                              <td className="px-3.5 py-2.5 align-baseline text-[13px]">
                                {plan.last_done_on ? (
                                  <>
                                    {date(plan.last_done_on)}
                                    {plan.last_done_meter_reading ? (
                                      <p className="text-[12.5px] text-ink-45">
                                        at {hours(plan.last_done_meter_reading)}
                                      </p>
                                    ) : null}
                                  </>
                                ) : (
                                  <span className="text-ink-45">Not recorded</span>
                                )}
                              </td>
                              <td
                                className={`font-cond px-3.5 py-2.5 text-right align-baseline text-[15px] font-semibold ${
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
            )}

            {work_orders.length > 0 ? (
              <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
                <div className="border-b border-ink-12 px-5 py-3">
                  <h2 className="text-[17px] font-semibold">Recent work</h2>
                </div>
                <ul className="divide-y divide-ink-06">
                  {work_orders.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-baseline gap-3 px-5 py-2.5">
                      <Link
                        href={`/work-orders/${order.id}`}
                        className="font-cond text-[15px] font-semibold hover:underline"
                      >
                        {order.number}
                      </Link>
                      <span className="min-w-0 flex-1 text-[13.5px]">{order.description}</span>
                      <span className="text-[12.5px] text-ink-45 capitalize">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5">
            {equipment.meter_type ? (
              <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
                <div className="border-b border-ink-12 px-4 py-2.5">
                  <h2 className="text-[15px] font-semibold">Meter</h2>
                </div>
                <div className="px-4 py-3.5">
                  <p className="font-cond text-[34px] leading-none font-bold">
                    {hours(equipment.current_meter_reading)}
                    <span className="ml-1.5 font-sans text-[13px] font-medium text-ink-45">
                      {unit}
                    </span>
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-45">
                    Read {date(equipment.current_meter_reading_on)}
                  </p>

                  {canRecord ? (
                    <div className="mt-4 border-t border-ink-12 pt-3.5">
                      <MeterReadingForm
                        equipmentId={equipment.id}
                        current={equipment.current_meter_reading}
                        unit={unit}
                      />
                    </div>
                  ) : null}
                </div>

                {readings.length > 0 ? (
                  <div className="border-t border-ink-12 px-4 py-3">
                    <p className="mb-1.5 text-[12.5px] font-medium text-ink-45">Recent readings</p>
                    <ul className="space-y-1">
                      {readings.slice(0, 6).map((reading) => (
                        <li key={reading.id} className="flex items-baseline gap-2 text-[13px]">
                          <span className="font-cond font-semibold">
                            {hours(reading.reading_value)}
                          </span>
                          <span className="text-ink-45">{date(reading.reading_on)}</span>
                          {reading.is_reset ? (
                            <span className="ml-auto text-[12px] text-caution">reset</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
              <div className="border-b border-ink-12 px-4 py-2.5">
                <h2 className="text-[15px] font-semibold">Register</h2>
              </div>
              <dl className="space-y-2.5 px-4 py-3">
                {[
                  ['Fitted to', equipment.vessel?.name ?? equipment.location?.name ?? '—'],
                  ['Category', equipment.category?.name ?? '—'],
                  ['OEM', equipment.model?.oem ?? '—'],
                  ['Duty', equipment.duty_status?.replace(/_/g, ' ') ?? '—'],
                  ['Installed', date(equipment.installation_date)],
                  ['Warranty expires', date(equipment.warranty_expiry_date)],
                  ['Statutory item', equipment.statutory_item_ref ?? '—'],
                  [
                    'Replacement value',
                    equipment.replacement_value
                      ? `₹${Number(equipment.replacement_value).toLocaleString('en-IN')}`
                      : '—',
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline gap-3">
                    <dt className="text-[12.5px] text-ink-45">{label}</dt>
                    <dd className="ml-auto text-right text-[13px] capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {children.length > 0 ? (
              <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
                <div className="border-b border-ink-12 px-4 py-2.5">
                  <h2 className="text-[15px] font-semibold">Sub-units</h2>
                </div>
                <ul className="divide-y divide-ink-06">
                  {children.map((child) => (
                    <li key={child.id} className="px-4 py-2.5">
                      <Link href={`/equipment/${child.id}`} className="text-[13.5px] font-medium hover:underline">
                        {child.name}
                      </Link>
                      <p className="text-[12px] text-ink-45">{child.code}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}
