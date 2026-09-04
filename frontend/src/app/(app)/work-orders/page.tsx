import Link from 'next/link';
import { IconWorkOrder } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';
import { BacklogPipeline, type BacklogData } from '@/components/backlog-pipeline';
import { requireUser } from '@/lib/auth';
import { backlogLabel, date } from '@/lib/format';
import { listWorkOrders, loadBacklog, statusLabel, typeLabel } from '@/lib/work-orders';
import type { BacklogState } from '@/types/api';

const statusTone: Record<string, string> = {
  draft: 'text-ink-45',
  released: 'text-shoal-deep',
  in_progress: 'text-caution',
  completed: 'text-safe',
  closed: 'text-ink-45',
  cancelled: 'text-ink-45',
};

const filters = [
  { key: '', label: 'Open' },
  { key: 'released', label: 'Released' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Closed' },
];

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; backlog_state?: string }>;
}) {
  await requireUser();
  const { status, backlog_state } = await searchParams;

  const [orders, backlog] = await Promise.all([
    listWorkOrders({
      status,
      backlog_state,
      open_only: status || backlog_state ? undefined : 1,
    }),
    loadBacklog().catch(() => null),
  ]);

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">Today</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">Work orders</h1>
          <p className="pb-1.5 text-[13px] text-ink-45">{orders.total} matching</p>
        </div>
      </header>

      <div className="space-y-6 px-7 py-7">
        {backlog ? <BacklogPipeline backlog={backlog as BacklogData} active={backlog_state} /> : null}

        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <SectionHeader
            icon={IconWorkOrder}
            title="Jobs"
            hint={`${orders.total} matching`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {filters.map((filter) => {
              const active = (status ?? '') === filter.key && !backlog_state;

              return (
                <Link
                  key={filter.label}
                  href={filter.key ? `/work-orders?status=${filter.key}` : '/work-orders'}
                  className={`rounded-full border px-3 py-[3px] text-[13px] transition-colors ${
                    active
                      ? 'border-ink bg-ink text-white'
                      : 'border-ink-22 text-ink-70 hover:bg-shoal-soft'
                  }`}
                >
                      {filter.label}
                    </Link>
                  );
                })}
              </div>
            }
          />

          {orders.data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-cond text-lg font-semibold">No work orders here.</p>
              <p className="mt-1 text-sm text-ink-45">
                Jobs appear when a task falls due, or when a breakdown is reported.
              </p>
            </div>
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
                {orders.data.map((order) => {
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
                        <p className="text-[12px] text-ink-45">{typeLabel[order.type] ?? order.type}</p>
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline">
                        <p className="font-medium">{order.description}</p>
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {order.equipment?.name ?? '—'}
                      </td>
                      <td className={`px-3.5 py-2.5 align-baseline text-[13.5px] ${overdue ? 'text-danger' : 'text-ink-70'}`}>
                        {date(order.due_on)}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13px] text-ink-70">
                        {order.backlog_state ? backlogLabel[order.backlog_state] : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline">
                        <span className={`text-sm font-medium ${statusTone[order.status] ?? ''}`}>
                          {statusLabel[order.status] ?? order.status}
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
