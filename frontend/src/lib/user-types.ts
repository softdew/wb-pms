/** Shapes with no server imports, safe for client components. */

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  employee_code: string | null;
  status: string;
  last_login_at: string | null;
  trade: { id: number; code: string; name: string } | null;
  operator: { id: number; code: string; name: string } | null;
  role: string | null;
}

export interface RoleOption {
  value: string;
  label: string;
}

export interface UsersPayload {
  users: ManagedUser[];
  roles: RoleOption[];
  trades: { id: number; code: string; name: string }[];
}

/**
 * What each role is actually for, in a line.
 *
 * A dropdown of eight role names tells an administrator nothing about which to
 * pick, and picking wrong is how the separation between scoring and approving
 * criticality quietly stops meaning anything.
 */
export const roleDescription: Record<string, string> = {
  'department-admin':
    'Everything, including users, operators and settings.',
  'technical-authority':
    'Approves criticality bands and interval changes. Cannot raise work orders.',
  planner:
    'Scores criticality, maintains plans and the library, raises work orders. Cannot approve a band.',
  supervisor: 'Executes, completes and closes work orders. Records readings and issues spares.',
  store: 'Maintains the parts catalogue and records stock movements.',
  auditor: 'Reads everything across the fleet. Writes nothing, ever.',
  management: 'Read-only reporting.',
  operator: 'Issued from the operator record, not here.',
};
