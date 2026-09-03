import { get } from '@/lib/api';
import type { Assessment, Distribution, Scales } from '@/lib/criticality-types';
import type { Equipment, Paginated } from '@/types/api';

// Re-exported so server components can import shapes and fetchers together.
export type { Assessment, Distribution, ScalePoint, Scales } from '@/lib/criticality-types';
export { triggerLabel } from '@/lib/criticality-types';

export const loadScales = () => get<Scales>('/criticality/scales');
export const loadPending = () => get<Paginated<Assessment>>('/criticality/pending');
export const loadDistribution = () => get<Distribution>('/criticality/distribution');
export const loadUnassessed = () => get<Paginated<Equipment>>('/criticality/unassessed');
export const loadHistory = (equipmentId: number) =>
  get<Paginated<Assessment>>(`/equipment/${equipmentId}/criticality`);
