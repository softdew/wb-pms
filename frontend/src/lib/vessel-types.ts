/** Shapes and labels with no server imports, safe for client components. */

export type VesselStatus = 'active' | 'under_repair' | 'laid_up' | 'disposed';

export interface ShipTypeOption {
  id: number;
  code: string;
  name: string;
}

export interface OperatorOption {
  id: number;
  code: string;
  name: string;
  type: string;
  agreement_no: string | null;
  tender_reference: string | null;
}

export interface InchargeOption {
  id: number;
  name: string;
  designation: string | null;
  licence_no: string | null;
  licence_valid_until: string | null;
}

export interface VesselRecord {
  id: number;
  code: string;
  name: string;
  ship_type_id: number | null;
  registration_no: string | null;
  official_no: string | null;
  commission_date: string | null;
  operating_zone: string | null;
  status: VesselStatus;
  remarks: string | null;
  operator_id: number | null;
  operator_from: string | null;
}

export interface MeterSnapshot {
  equipment: string;
  name: string;
  meter_type: string | null;
  reading: number;
  read_on: string | null;
}

export interface OutstandingJob {
  number: string;
  description: string;
  due_on: string | null;
  state: string | null;
}

export interface HandoverPosition {
  meter_readings: MeterSnapshot[];
  open_work_orders: number;
  overdue_tasks: number;
  outstanding: OutstandingJob[];
}

export interface AssignmentPreview {
  vessel: { id: number; code: string; name: string; operator_id: number | null; operator_from: string | null };
  current_operator: { id: number; code: string; name: string } | null;
  position: HandoverPosition;
  operators: OperatorOption[];
  incharges: InchargeOption[];
}

export interface Assignment {
  id: number;
  assigned_from: string;
  assigned_until: string | null;
  agreement_no: string | null;
  tender_reference: string | null;
  remarks: string | null;
  operator?: { id: number; code: string; name: string; type: string } | null;
  incharge?: { id: number; name: string; licence_no: string | null } | null;
}

export const vesselStatusLabel: Record<VesselStatus, string> = {
  active: 'Active',
  under_repair: 'Under repair',
  laid_up: 'Laid up',
  disposed: 'Disposed',
};

export const operatingZoneLabel: Record<string, string> = {
  river: 'River',
  coastal: 'Coastal',
  offshore: 'Offshore',
};
