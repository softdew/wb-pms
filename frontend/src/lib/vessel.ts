import { get } from '@/lib/api';
import type { PlanWithProgress } from '@/lib/fleet';
import type { CriticalityBand, Paginated, Vessel, WorkOrder } from '@/types/api';

export interface EquipmentSummary {
  id: number;
  code: string;
  name: string;
  serial_no: string | null;
  category: { id: number; code: string; name: string } | null;
  make_model: string | null;
  criticality_band: CriticalityBand | null;
  criticality_index: number | null;
  maintenance_strategy: string | null;
  hidden_failure_flag: boolean;
  meter_type: string | null;
  current_meter_reading: string | null;
  current_meter_reading_on: string | null;
  warranty_expiry_date: string | null;
  due: number;
  soon: number;
  ok: number;
  plans: number;
}

export interface VesselOverview {
  vessel: Vessel & {
    official_no?: string | null;
    commission_date?: string | null;
    current_assignment?: {
      assigned_from: string;
      agreement_no: string | null;
      tender_reference: string | null;
      operator?: { id: number; name: string } | null;
    } | null;
  };
  equipment: EquipmentSummary[];
  totals: { equipment: number; plans: number; due: number; soon: number; ok: number };
}

export async function loadVessel(id: number): Promise<VesselOverview> {
  return get<VesselOverview>(`/vessels/${id}/overview`);
}

/**
 * The schedule for a vessel, grouped the way the client's own sheet groups it:
 * by equipment, then by the section on the task, then in print order.
 */
export interface ScheduleGroup {
  equipmentId: number;
  equipmentName: string;
  equipmentCode: string;
  meterReading: string | null;
  sections: { section: string; plans: PlanWithProgress[] }[];
}

export async function loadSchedule(vesselId: number): Promise<PlanWithProgress[]> {
  const page = await get<Paginated<PlanWithProgress>>('/maintenance-plans', {
    vessel_id: vesselId,
    per_page: 500,
  });

  return page.data;
}

export function groupSchedule(
  plans: PlanWithProgress[],
  equipment: EquipmentSummary[],
): ScheduleGroup[] {
  const byEquipment = new Map<number, PlanWithProgress[]>();

  for (const plan of plans) {
    const id = plan.equipment?.id;
    if (!id) continue;

    byEquipment.set(id, [...(byEquipment.get(id) ?? []), plan]);
  }

  return equipment
    .filter((item) => byEquipment.has(item.id))
    .map((item) => {
      const own = byEquipment.get(item.id) ?? [];
      const sections = new Map<string, PlanWithProgress[]>();

      for (const plan of own) {
        const key = plan.task?.section ?? 'Other tasks';
        sections.set(key, [...(sections.get(key) ?? []), plan]);
      }

      return {
        equipmentId: item.id,
        equipmentName: item.name,
        equipmentCode: item.code,
        meterReading: item.current_meter_reading,
        sections: [...sections.entries()].map(([section, list]) => ({
          section,
          plans: list.sort((a, b) => (a.task?.sort_order ?? 0) - (b.task?.sort_order ?? 0)),
        })),
      };
    });
}

/** Work raised against anything fitted to this vessel. */
export function loadVesselWorkOrders(vesselId: number) {
  return get<Paginated<WorkOrder>>('/work-orders', { vessel_id: vesselId, per_page: 100 });
}

export interface Tenure {
  id: number;
  assigned_from: string;
  assigned_until: string | null;
  agreement_no: string | null;
  tender_reference: string | null;
  remarks: string | null;
  operator?: { id: number; code: string; name: string; type: string } | null;
  incharge?: { id: number; name: string; licence_no: string | null } | null;
}

/** Who has held this vessel, most recent first. */
export function loadTenure(vesselId: number) {
  return get<Tenure[]>(`/vessels/${vesselId}/history`);
}
