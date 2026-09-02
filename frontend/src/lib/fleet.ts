import { get } from '@/lib/api';
import type { Tick } from '@/components/sounding';
import type { DueStatus, MaintenancePlan, Paginated, Vessel } from '@/types/api';

/** A plan as the index endpoint returns it, with the computed figures. */
export interface PlanWithProgress extends MaintenancePlan {
  interval_value: number | null;
  interval_label: string | null;
  consumed: number | null;
  remaining: number | null;
  is_meter_based: boolean;
}

export interface VesselSummary {
  vessel: Vessel;
  due: number;
  soon: number;
  ok: number;
  total: number;
  worst: PlanWithProgress | null;
}

export interface FleetView {
  vessels: VesselSummary[];
  ticks: Tick[];
  counts: { due: number; soon: number; ok: number; total: number };
  unassigned: number;
}

/**
 * Position a task on the sounding scale: −1 is a full interval past due or
 * worse, 0 is the due point, 1 is freshly completed.
 *
 * Proportion rather than hours, because a 10-hour check and a 9,000-hour
 * overhaul share no absolute axis.
 */
function positionOf(plan: PlanWithProgress): number {
  const interval = plan.interval_value;
  const remaining = plan.remaining;

  if (!interval || interval <= 0 || remaining === null) {
    return plan.due_status === 'due' ? -1 : 1;
  }

  return Math.max(-1, Math.min(1, remaining / interval));
}

export async function loadFleet(): Promise<FleetView> {
  const [vesselPage, planPage] = await Promise.all([
    get<Paginated<Vessel>>('/vessels', { per_page: 100 }),
    get<Paginated<PlanWithProgress>>('/maintenance-plans', { per_page: 500 }),
  ]);

  const byVessel = new Map<number, VesselSummary>();

  for (const vessel of vesselPage.data) {
    byVessel.set(vessel.id, { vessel, due: 0, soon: 0, ok: 0, total: 0, worst: null });
  }

  const ticks: Tick[] = [];
  const counts = { due: 0, soon: 0, ok: 0, total: 0 };

  for (const plan of planPage.data) {
    const status: DueStatus = plan.due_status ?? 'on_track';

    counts.total += 1;
    if (status === 'due') counts.due += 1;
    else if (status === 'due_soon') counts.soon += 1;
    else counts.ok += 1;

    ticks.push({
      position: positionOf(plan),
      status,
      label: `${plan.equipment?.name ?? 'Equipment'} — ${plan.task?.activity_description ?? 'Task'}`,
    });

    const vesselId = (plan.equipment as { vessel_id?: number } | undefined)?.vessel_id;
    const summary = vesselId ? byVessel.get(vesselId) : undefined;

    if (!summary) continue;

    summary.total += 1;
    if (status === 'due') summary.due += 1;
    else if (status === 'due_soon') summary.soon += 1;
    else summary.ok += 1;

    // The single worst task on the vessel, for the "needs attention" column.
    if (
      status === 'due' &&
      (summary.worst === null || (plan.remaining ?? 0) < (summary.worst.remaining ?? 0))
    ) {
      summary.worst = plan;
    }
  }

  const vessels = [...byVessel.values()].sort((a, b) => b.due - a.due || a.vessel.name.localeCompare(b.vessel.name));

  return {
    vessels,
    ticks,
    counts,
    unassigned: vesselPage.data.filter((v) => !v.operator_id).length,
  };
}
