import { get } from '@/lib/api';
import type { AssignmentPreview, Assignment, ShipTypeOption, VesselRecord } from '@/lib/vessel-types';
import type { Paginated } from '@/types/api';

export type {
  Assignment,
  AssignmentPreview,
  InchargeOption,
  OperatorOption,
  ShipTypeOption,
  VesselRecord,
  VesselStatus,
} from '@/lib/vessel-types';
export { operatingZoneLabel, vesselStatusLabel } from '@/lib/vessel-types';

export const loadVesselRecord = (id: number) => get<VesselRecord>(`/vessels/${id}`);
export const loadShipTypes = () => get<Paginated<ShipTypeOption>>('/ship-types', { per_page: 100 });
export const loadAssignmentPreview = (id: number) => get<AssignmentPreview>(`/vessels/${id}/assignment`);
export const loadAssignmentHistory = (id: number) => get<Assignment[]>(`/vessels/${id}/history`);
