/** Shapes with no server imports, safe for client components. */

export interface PartRecord {
  id: number;
  code: string;
  name: string;
  part_category_id: number | null;
  oem_reference: string | null;
  uom: string;
  unit_cost: string | null;
  lead_time_days: number;
  remarks: string | null;
  is_active: boolean;
  category?: { id: number; code: string; name: string } | null;
}

export interface Holding {
  operator_id: number;
  stock_qty: number;
  reorder_level: number | null;
  below: boolean;
}

export interface StockRow {
  part: {
    id: number;
    code: string;
    name: string;
    uom: string;
    lead_time_days: number;
    category: { id: number; code: string; name: string } | null;
  };
  holdings: Holding[];
  total: number;
  short: number;
}

export interface OperatorColumn {
  id: number;
  code: string;
  name: string;
  type?: string;
}

export interface StockPayload {
  operators: OperatorColumn[];
  rows: StockRow[];
  own_operator_id: number | null;
  totals: { lines: number; below_reorder: number };
}

export interface Movement {
  id: number;
  type: string;
  quantity: string;
  balance_after: string;
  transacted_on: string;
  reference_no: string | null;
  remarks: string | null;
  operator?: { id: number; code: string; name: string } | null;
  recorded_by?: { id: number; name: string } | null;
  work_order?: { id: number; number: string } | null;
}

export const movementLabel: Record<string, string> = {
  receipt: 'Received',
  issue: 'Issued',
  return: 'Returned',
  adjustment: 'Adjusted',
};
