/** Shapes and labels with no server imports, safe for client components. */

export type MeterType = 'running_hours' | 'cycles' | 'sailings';
export type DutyStatus = 'duty' | 'standby' | 'spare';
export type TaxonomyLevel =
  | 'installation'
  | 'system'
  | 'equipment_unit'
  | 'sub_unit'
  | 'component';

export interface Option {
  id: number;
  code: string;
  name: string;
}

export interface ModelOption {
  id: number;
  make: string;
  model: string;
  oem: string | null;
  equipment_category_id: number | null;
}

export interface EquipmentRecord {
  id: number;
  code: string;
  name: string;
  serial_no: string | null;
  parent_id: number | null;
  taxonomy_level: TaxonomyLevel | null;
  vessel_id: number | null;
  location_id: number | null;
  equipment_category_id: number | null;
  equipment_model_id: number | null;
  installation_date: string | null;
  last_renewal_date: string | null;
  warranty_expiry_date: string | null;
  duty_status: DutyStatus | null;
  meter_type: MeterType | null;
  current_meter_reading: string | null;
  statutory_item_ref: string | null;
  replacement_value: string | null;
  hidden_failure_flag: boolean;
  criticality_band: string | null;
  criticality_index: number | null;
  maintenance_strategy: string | null;
  status: string;
  remarks: string | null;
}

export const meterTypeLabel: Record<MeterType, string> = {
  running_hours: 'Running hours',
  cycles: 'Cycles',
  sailings: 'Sailings',
};

export const dutyStatusLabel: Record<DutyStatus, string> = {
  duty: 'On duty',
  standby: 'Standby',
  spare: 'Spare',
};

export const taxonomyLabel: Record<TaxonomyLevel, string> = {
  installation: 'Installation',
  system: 'System',
  equipment_unit: 'Equipment unit',
  sub_unit: 'Sub-unit',
  component: 'Component',
};

/** Where a level normally sits, to explain the hierarchy without a manual. */
export const taxonomyHint: Record<TaxonomyLevel, string> = {
  installation: 'The fleet, a ghat, a workshop',
  system: 'A vessel, a jetty structure, shore power',
  equipment_unit: 'Main engine, generator, gangway hoist',
  sub_unit: 'Turbocharger, fuel injection system, control panel',
  component: 'Injector, relay, bearing',
};
