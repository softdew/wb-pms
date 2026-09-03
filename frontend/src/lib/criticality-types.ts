import type { CriticalityBand, Equipment } from '@/types/api';

/**
 * Types and labels, with no server imports.
 *
 * Client components need these, and anything they import is bundled — so this
 * must not reach lib/api.ts, which reaches next/headers through the session
 * cookie. Keeping the shapes here and the fetchers next door is what stops that
 * chain being dragged into the browser.
 */

export interface ScalePoint {
  factor: 'C' | 'E' | 'R';
  value: number;
  label: string;
  anchor: string | null;
}

export interface Scales {
  factors: { C: ScalePoint[]; E: ScalePoint[]; R: ScalePoint[] };
  thresholds: { high: number; medium: number };
}

export interface Assessment {
  id: number;
  equipment_id: number;
  consequence_c: number;
  exposure_e: number;
  redundancy_r: number;
  criticality_index: number;
  band: CriticalityBand;
  high_threshold_applied: number;
  medium_threshold_applied: number;
  status: 'pending' | 'approved' | 'rejected';
  review_trigger: string | null;
  justification: string | null;
  decision_remarks: string | null;
  assessed_at: string | null;
  approved_at: string | null;
  assessor?: { id: number; name: string } | null;
  approver?: { id: number; name: string } | null;
  equipment?: Equipment & { vessel?: { id: number; code: string; name: string } | null };
}

export interface Distribution {
  high: number;
  medium: number;
  low: number;
  unassessed: number;
  total: number;
  high_percent: number;
}

/** The four events that re-open a band, plus the first assessment. */
export const triggerLabel: Record<string, string> = {
  initial: 'Initial assessment',
  modification: 'Modification or re-engining',
  duty_change: 'Change of route or duty',
  repeated_failure: 'Serious or repeated failure',
  statutory_change: 'Change in statutory status',
};
