import { cache } from 'react';
import { redirect } from 'next/navigation';
import { get } from '@/lib/api';
import { getToken } from '@/lib/session';
import type { CurrentUser, Role } from '@/types/api';

/**
 * The signed-in user, fetched once per request.
 *
 * Returns null rather than throwing when there is no token, so a layout can
 * decide whether to redirect.
 */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!(await getToken())) return null;

  try {
    return await get<CurrentUser>('/me');
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();

  if (!user) redirect('/login');

  return user;
}

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
