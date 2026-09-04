/** Shapes and labels with no server imports, safe for client components. */

export type IntervalUnit = 'hours' | 'days' | 'weeks' | 'months' | 'years';
export type TriggerClass = 'calendar' | 'meter' | 'condition' | 'event' | 'statutory';
export type PartLineType = 'spare' | 'consumable' | 'special_tool';

export interface TaskReading {
  id?: number;
  parameter: string;
  unit: string | null;
  minimum: string | number | null;
  maximum: string | number | null;
  is_mandatory: boolean;
}

export interface TaskPart {
  id?: number;
  part_id: number;
  quantity: string | number;
  line_type: PartLineType;
  part?: { id: number; code: string; name: string; uom: string };
}

export interface ChecklistTask {
  id: number;
  code: string;
  activity_description: string;
  section: string | null;
  sort_order: number;
  equipment_category_id: number | null;
  default_interval_value: string | null;
  default_interval_unit: IntervalUnit | null;
  first_interval_value: string | null;
  default_trigger_class: TriggerClass;
  controlling_reference: string | null;
  estimated_hours: string | null;
  trade_id: number | null;
  persons_required: number | null;
  safety_instructions: string | null;
  permits_required: string | null;
  acceptance_criteria: string | null;
  criticality: string | null;
  is_active: boolean;
  applied_count?: number;
  category?: { id: number; code: string; name: string } | null;
  trade?: { id: number; code: string; name: string } | null;
  readings?: TaskReading[];
  parts?: TaskPart[];
}

export interface LibraryPreviewTask {
  id: number;
  code: string;
  activity_description: string;
  section: string | null;
  interval_label: string | null;
  trigger_class: TriggerClass | null;
  controlling_reference: string | null;
  already_applied: boolean;
  blocked: boolean;
}

export interface LibraryPreview {
  equipment: {
    id: number;
    code: string;
    name: string;
    meter_type: string | null;
    current_meter_reading: string | null;
    criticality_band: string | null;
    category: { id: number; code: string; name: string } | null;
    vessel: { id: number; code: string; name: string } | null;
  };
  tasks: LibraryPreviewTask[];
}

export const intervalUnitLabel: Record<IntervalUnit, string> = {
  hours: 'Running hours',
  days: 'Days',
  weeks: 'Weeks',
  months: 'Months',
  years: 'Years',
};

export const triggerClassLabel: Record<TriggerClass, string> = {
  calendar: 'Calendar',
  meter: 'Meter or usage',
  condition: 'Condition threshold',
  event: 'Event',
  statutory: 'Statutory survey',
};

export const triggerClassHint: Record<TriggerClass, string> = {
  calendar: 'Due a set time after the last completion.',
  meter: 'Due after so many running hours. Needs a metered asset.',
  condition: 'Raised when a measured value crosses a limit.',
  event: 'Raised on an occurrence — grounding, overheat, heavy weather.',
  statutory: 'A survey date, with an outer limit no extension may pass.',
};

export const partLineTypeLabel: Record<PartLineType, string> = {
  spare: 'Spare',
  consumable: 'Consumable',
  special_tool: 'Special tool',
};
