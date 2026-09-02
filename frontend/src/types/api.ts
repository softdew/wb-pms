/** Shapes returned by the Laravel API. Kept in one file so a schema change
 *  surfaces as a type error rather than as a blank column. */

export type Role =
  | 'department-admin'
  | 'technical-authority'
  | 'planner'
  | 'supervisor'
  | 'store'
  | 'operator'
  | 'auditor'
  | 'management';

export type DueStatus = 'on_track' | 'due_soon' | 'due';

export type CriticalityBand = 'high' | 'medium' | 'low';

export type BacklogState =
  | 'ready_to_execute'
  | 'waiting_on_material'
  | 'waiting_on_asset_availability';

export interface Organisation {
  id: number;
  code: string;
  name: string;
  type: string;
}

export interface Operator {
  id: number;
  code: string;
  name: string;
  type: 'department' | 'private_company' | 'cooperative_society';
  agreement_no: string | null;
  tender_reference: string | null;
  status: string;
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  employee_code: string | null;
  is_platform_admin: boolean;
  trade: { id: number; code: string; name: string } | null;
  organisation: Organisation | null;
  roles: Role[];
}

export interface Vessel {
  id: number;
  code: string;
  name: string;
  registration_no: string | null;
  operating_zone: string | null;
  status: 'active' | 'under_repair' | 'laid_up' | 'disposed';
  operator_id: number | null;
  ship_type?: { id: number; code: string; name: string } | null;
  operator?: Operator | null;
  incharge?: { id: number; name: string; licence_no: string | null } | null;
}

export interface Equipment {
  id: number;
  code: string;
  name: string;
  serial_no: string | null;
  criticality_band: CriticalityBand | null;
  criticality_index: number | null;
  maintenance_strategy: string | null;
  meter_type: string | null;
  current_meter_reading: string | null;
  hidden_failure_flag: boolean;
  vessel?: Pick<Vessel, 'id' | 'code' | 'name'> | null;
  category?: { id: number; code: string; name: string } | null;
}

export interface MaintenancePlan {
  id: number;
  trigger_class: string;
  applicable_interval_value: string | null;
  applicable_interval_unit: string | null;
  last_done_on: string | null;
  last_done_meter_reading: string | null;
  next_due_on: string | null;
  next_due_meter_reading: string | null;
  due_status: DueStatus | null;
  status: string;
  equipment?: Pick<Equipment, 'id' | 'code' | 'name'>;
  task?: {
    id: number;
    code: string;
    activity_description: string;
    section: string | null;
    sort_order: number;
    controlling_reference: string | null;
  };
}

export interface WorkOrder {
  id: number;
  number: string;
  description: string;
  type: string;
  status: string;
  backlog_state: BacklogState | null;
  due_on: string | null;
  priority: CriticalityBand | null;
  equipment?: Pick<Equipment, 'id' | 'code' | 'name'>;
  assignee?: { id: number; name: string } | null;
}

/** Laravel's paginator. */
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
