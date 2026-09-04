import { get } from '@/lib/api';

export interface ReadinessItem {
  key: string;
  label: string;
  count: number;
  consequence: string;
  href: string;
}

export interface AttentionItem {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: 'caution' | 'danger';
}

export interface OperatorRow {
  id: number;
  code: string;
  name: string;
  type: string | null;
  vessels: number;
  equipment: number;
  plans: number;
  due: number;
  soon: number;
  ok: number;
  open_work_orders: number;
  unplanned_jobs: number;
  total_jobs: number;
  agreement_to: string | null;
  users: number;
}

export interface Overview {
  readiness: ReadinessItem[];
  attention: AttentionItem[];
  operators: OperatorRow[];
  totals: { operators: number; vessels: number; equipment: number; plans: number };
}

export const loadOverview = () => get<Overview>('/overview');
