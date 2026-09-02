import type { BacklogState, CriticalityBand, DueStatus } from '@/types/api';

/** The labels the client uses on their own sheets: ok, soon, due. */
export const dueStatusLabel: Record<DueStatus, string> = {
  on_track: 'On track',
  due_soon: 'Due soon',
  due: 'Due',
};

export const dueStatusColour: Record<DueStatus, string> = {
  on_track: 'text-safe',
  due_soon: 'text-caution',
  due: 'text-danger',
};

export const dueStatusBar: Record<DueStatus, string> = {
  on_track: 'bg-safe',
  due_soon: 'bg-caution',
  due: 'bg-danger',
};

export const bandLabel: Record<CriticalityBand, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const backlogLabel: Record<BacklogState, string> = {
  ready_to_execute: 'Ready to execute',
  waiting_on_material: 'Waiting on material',
  waiting_on_asset_availability: 'Waiting on asset availability',
};

export const vesselStatusLabel: Record<string, string> = {
  active: 'Active',
  under_repair: 'Under repair',
  laid_up: 'Laid up',
  disposed: 'Disposed',
};

/** Hours and readings, without trailing zeros. */
export function hours(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';

  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

export function date(value: string | null | undefined): string {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
