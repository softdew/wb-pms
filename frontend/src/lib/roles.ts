import type { CurrentUser, Role } from '@/types/api';

/**
 * Role checks with no server imports.
 *
 * The rail is a client component — it needs the current path — so anything it
 * imports gets bundled. Keeping these separate from lib/auth.ts stops the
 * session cookie and next/headers being dragged into the browser.
 */
export function hasRole(user: CurrentUser, ...roles: Role[]): boolean {
  return user.is_platform_admin || roles.some((role) => user.roles.includes(role));
}

/** An operating company's shared login, as opposed to department staff. */
export function isOperator(user: CurrentUser): boolean {
  return user.roles.includes('operator');
}

export function isReadOnly(user: CurrentUser): boolean {
  return (
    !user.is_platform_admin &&
    user.roles.every((role) => role === 'auditor' || role === 'management')
  );
}
