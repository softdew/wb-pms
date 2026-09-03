/** Shapes and labels with no server imports, safe for client components. */

export type OperatorType = 'department' | 'private_company' | 'cooperative_society';

export interface Operator {
  id: number;
  code: string;
  name: string;
  type: OperatorType;
  agreement_no: string | null;
  tender_reference: string | null;
  agreement_from: string | null;
  agreement_to: string | null;
  contact_name: string | null;
  contact_designation: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  remarks: string | null;
  status: 'active' | 'ended';
  vessels_count?: number;
  users_count?: number;
}

export interface OperatorUser {
  id: number;
  name: string;
  email: string;
  status: string;
  last_login_at: string | null;
}

export interface OperatorIncharge {
  id: number;
  name: string;
  designation: string | null;
  licence_no: string | null;
  licence_valid_until: string | null;
  status: string;
}

export interface OperatorDetail {
  operator: Operator;
  vessels: {
    id: number;
    code: string;
    name: string;
    status: string;
    operator_from: string | null;
    ship_type?: { id: number; code: string; name: string } | null;
  }[];
  users: OperatorUser[];
  incharges: OperatorIncharge[];
}

export const operatorTypeLabel: Record<OperatorType, string> = {
  department: 'Department operated',
  private_company: 'Private company',
  cooperative_society: 'Cooperative society',
};
