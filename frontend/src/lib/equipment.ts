import { get } from '@/lib/api';
import type { EquipmentRecord, ModelOption, Option } from '@/lib/equipment-types';
import type { Equipment, Paginated } from '@/types/api';

export type {
  DutyStatus,
  EquipmentRecord,
  MeterType,
  ModelOption,
  Option,
  TaxonomyLevel,
} from '@/lib/equipment-types';
export {
  dutyStatusLabel,
  meterTypeLabel,
  taxonomyHint,
  taxonomyLabel,
} from '@/lib/equipment-types';

export const loadEquipmentRecord = (id: number) => get<EquipmentRecord>(`/equipment/${id}`);

export const listEquipment = (query: Record<string, string | number | undefined> = {}) =>
  get<Paginated<Equipment>>('/equipment', { per_page: 100, ...query });

export const loadCategories = () =>
  get<Paginated<Option>>('/equipment-categories', { per_page: 200 });

export const loadModels = () =>
  get<Paginated<ModelOption>>('/equipment-models', { per_page: 500 });

export const loadVesselOptions = () => get<Paginated<Option>>('/vessels', { per_page: 200 });

export const loadLocationOptions = () => get<Paginated<Option>>('/locations', { per_page: 200 });
