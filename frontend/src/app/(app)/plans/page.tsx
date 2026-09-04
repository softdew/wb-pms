import Link from 'next/link';
import { IntervalBar } from '@/components/interval-bar';
import { PlanRowActions } from '@/components/plan-row-actions';
import { DueBadge } from '@/components/status';
import { get } from '@/lib/api';
import { hasRole, isOperator, requireUser } from '@/lib/auth';
import { date, hours } from '@/lib/format';
import type { PlanWithProgress } from '@/lib/fleet';
import { triggerClassLabel } from '@/lib/task-types';
import type { Paginated, Vessel } from '@/types/api';

const statusFilters = [
  { key: '', label: 'All' },
  { key: 'due', label: 'Due' },
  { key: 'due_soon', label: 'Due soon' },
  { key: 'on_track', label: 'On track' },
];

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ due_status?: string; vessel_id?: string; suspended?: string }>;
}) {
  const user = await requireUser();
  const { due_status, vessel_id, suspended } = await searchParams;

  const [plans, vessels] = await Promise.all([
    get<Paginated<PlanWithProgress>>('/maintenance-plans', {
      due_status,
      vessel_id: vessel_id ? Number(vessel_id) : undefined,
      active_only: suspended ? 0 : 1,
      per_page: 200,
    }),
    get<Paginated<Vessel>>('/vessels', { per_page: 100 }).catch(() => ({ data: [] })),
  ]);

  const canManage = hasRole(user, 'department-admin', 'planner', 'technical-authority');
  const canRaise = hasRole(user, 'department-admin', 'planner');
  const operator = isOperator(user);

  // Grouped by vessel, then equipment, because that is how a planner reads a
  // schedule — one boat at a time, not one long list.
  const grouped = plans.data.reduce<
    Record<string, { vessel: string; equipment: Record<string, PlanWithProgress[]> }>
  >((acc, plan) => {
    const vesselName =
      (plan.equipment as { vessel?: { name?: string } } | undefined)?.vessel?.name ??
      'Shore equipment';
    const equipmentName = plan.equipment?.name ?? 'Unassigned';

    acc[vesselName] ??= { vessel: vesselName, equipment: {} };
    acc[vesselName].equipment[equipmentName] = [
      ...(acc[vesselName].equipment[equipmentName] ?? []),
      plan,
    ];

    return acc;
  }, {});

  const counts = {
    due: plans.data.filter((p) => p.due_status === 'due').length,
    soon: plans.data.filter((p) => p.due_status === 'due_soon').length,
  };

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">Fleet</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">
            {operator ? 'Our maintenance plans' : 'Maintenance plans'}
          </h1>
          <p className="pb-1.5 text-[13px] text-ink-45">
            {plans.total} {suspended ? 'suspended ' : 'active '}
            {plans.total === 1 ? 'plan line' : 'plan lines'}
            {counts.due > 0 ? <span className="text-danger"> · {counts.due} due</span> : null}
            {counts.soon > 0 ? (
              <span className="text-caution"> · {counts.soon} due soon</span>
            ) : null}
          </p>
        </div>
      </header>

      <div className="space-y-5 px-7 py-6">
        <section className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-12 bg-white px-4.5 py-3">
          {statusFilters.map((filter) => {
            const active = (due_status ?? '') === filter.key;
            const query = new URLSearchParams();
            if (filter.key) query.set('due_status', filter.key);
            if (vessel_id) query.set('vessel_id', vessel_id);

            return (
              <Link
                key={filter.label}
                href={`/plans${query.toString() ? `?${query}` : ''}`}
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

          <form className="ml-auto flex items-center gap-2">
            {due_status ? <input type="hidden" name="due_status" value={due_status} /> : null}
            <label htmlFor="vessel_id" className="text-[13px] text-ink-45">
              Vessel
            </label>
            <select
              id="vessel_id"
              name="vessel_id"
              defaultValue={vessel_id ?? ''}
              className="rounded-md border border-ink-22 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-ink-45"
            >
              <option value="">All</option>
              {vessels.data.map((vessel) => (
                <option key={vessel.id} value={vessel.id}>
                  {vessel.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-ink-22 px-3 py-1.5 text-[13px] font-medium hover:bg-shoal-soft"
            >
              Apply
            </button>
          </form>

          <Link
            href={suspended ? '/plans' : '/plans?suspended=1'}
            className={`rounded-full border px-3 py-[3px] text-[13px] transition-colors ${
              suspended
                ? 'border-ink bg-ink text-white'
                : 'border-ink-22 text-ink-70 hover:bg-shoal-soft'
            }`}
          >
            Suspended
          </Link>
        </section>

        {plans.data.length === 0 ? (
          <section className="rounded-lg border border-ink-12 bg-white px-6 py-12 text-center">
            <p className="font-cond text-lg font-semibold">
              {due_status || vessel_id || suspended
                ? 'Nothing matches those filters.'
                : 'No maintenance plans yet.'}
            </p>
            <p className="mt-1 text-sm text-ink-45">
              {due_status || vessel_id || suspended
                ? 'Clear a filter to see more.'
                : 'Register equipment against a vessel, then apply the task library to it.'}
            </p>
          </section>
        ) : (
          Object.values(grouped).map((group) => (
            <section
              key={group.vessel}
              className="overflow-hidden rounded-lg border border-ink-12 bg-white"
            >
              <div className="border-b border-ink-12 px-5 py-3">
                <h2 className="text-[17px] font-semibold">{group.vessel}</h2>
              </div>

              {Object.entries(group.equipment).map(([equipmentName, list]) => (
                <div key={equipmentName}>
                  <div className="border-b border-ink-06 bg-shoal-soft px-5 py-2">
                    <p className="font-cond text-[14px] font-semibold tracking-wide">
                      {equipmentName}
                    </p>
                  </div>

                  <table className="w-full">
                    <tbody>
                      {list.map((plan) => {
                        const overdue = plan.due_status === 'due';
                        const isSuspended = plan.status !== 'active';

                        return (
                          <tr
                            key={plan.id}
                            className={`border-b border-ink-06 last:border-0 hover:bg-shoal-soft ${
                              isSuspended ? 'opacity-55' : ''
                            }`}
                          >
                            <td className="px-3.5 py-2.5 align-baseline">
                              <p className="font-medium">{plan.task?.activity_description}</p>
                              <p className="text-[12.5px] text-ink-45">
                                {triggerClassLabel[
                                  plan.trigger_class as keyof typeof triggerClassLabel
                                ] ?? plan.trigger_class}
                                {plan.task?.controlling_reference
                                  ? ` · Manual ${plan.task.controlling_reference}`
                                  : ''}
                                {isSuspended ? ' · suspended' : ''}
                              </p>
                            </td>

                            <td className="font-cond w-28 px-3.5 py-2.5 text-right align-baseline text-[15px] font-semibold">
                              {plan.interval_label ?? '—'}
                            </td>

                            <td className="w-32 px-3.5 py-2.5 align-baseline text-[13px]">
                              {plan.last_done_on ? (
                                date(plan.last_done_on)
                              ) : (
                                <span className="text-ink-45">Never done</span>
                              )}
                            </td>

                            <td
                              className={`font-cond w-24 px-3.5 py-2.5 text-right align-baseline text-[15px] font-semibold ${
                                overdue ? 'text-danger' : ''
                              }`}
                            >
                              {plan.remaining === null
                                ? '—'
                                : plan.remaining < 0
                                  ? `\u2212${hours(Math.abs(plan.remaining))}`
                                  : hours(plan.remaining)}
                            </td>

                            <td className="w-36 px-3.5 py-2.5 align-baseline">
                              <DueBadge status={plan.due_status} />
                              <IntervalBar
                                consumed={plan.consumed}
                                interval={plan.interval_value}
                                overdue={overdue}
                              />
                            </td>

                            <td className="w-36 px-3.5 py-2.5 align-baseline">
                              <PlanRowActions
                                id={plan.id}
                                suspended={isSuspended}
                                canManage={canManage}
                                canRaise={canRaise}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </>
  );
}
