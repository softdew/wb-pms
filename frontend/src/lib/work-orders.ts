import { get } from '@/lib/api';
import type { BacklogState, Paginated, WorkOrder } from '@/types/api';

export interface WorkOrderReading {
  id: number;
  parameter: string;
  unit: string | null;
  minimum: string | null;
  maximum: string | null;
  is_mandatory: boolean;
  value: string | null;
  is_within_limits: boolean | null;
  observation: string | null;
}

export interface WorkOrderPartLine {
  id: number;
  planned_quantity: string;
  actual_quantity: string | null;
  line_type: string;
  part?: { id: number; code: string; name: string; uom: string };
}

export interface WorkOrderLabourLine {
  id: number;
  standard_hours: string | null;
  actual_hours: string | null;
  persons: number;
  trade?: { id: number; code: string; name: string } | null;
}

export interface WorkOrderCloseout {
  id: number;
  planned_downtime_hours: string;
  unplanned_downtime_hours: string;
  acceptance_criteria_met: boolean;
  completed_on: string;
  observations: string | null;
  failure_mode?: { code: string; description: string } | null;
  cause?: { code: string; description: string } | null;
  detection_method?: { code: string; description: string } | null;
  severity?: { code: string; description: string } | null;
}

export interface WorkOrderDetail extends WorkOrder {
  permit_reference: string | null;
  released_on: string | null;
  started_on: string | null;
  completed_on: string | null;
  meter_at_completion: string | null;
  estimated_hours: string | null;
  actual_cost: string | null;
  task_snapshot: Record<string, unknown> | null;
  readings: WorkOrderReading[];
  parts: WorkOrderPartLine[];
  labour: WorkOrderLabourLine[];
  closeout: WorkOrderCloseout | null;
  plan?: { id: number } | null;
}

export interface CodeOption {
  id: number;
  type: string;
  code: string;
  description: string;
}

export type CodeSets = Record<
  'failure_mode' | 'cause' | 'detection_method' | 'severity',
  CodeOption[]
>;

export const statusLabel: Record<string, string> = {
  draft: 'Draft',
  released: 'Released',
  in_progress: 'In progress',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const typeLabel: Record<string, string> = {
  preventive: 'Preventive',
  breakdown: 'Breakdown',
  overhaul: 'Overhaul',
  statutory: 'Statutory',
  condition_based: 'Condition based',
  failure_finding: 'Failure finding',
};

export function listWorkOrders(query: Record<string, string | number | undefined>) {
  return get<Paginated<WorkOrder>>('/work-orders', { per_page: 50, ...query });
}

export function loadWorkOrder(id: number) {
  return get<WorkOrderDetail>(`/work-orders/${id}`);
}

export function loadCodeSets() {
  return get<CodeSets>('/failure-codes');
}

export function loadBacklog() {
  return get<Record<BacklogState, { label: string; count: number; overdue: number }>>(
    '/work-orders/backlog',
  );
}
