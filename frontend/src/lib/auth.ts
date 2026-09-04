import { cache } from 'react';
import { redirect } from 'next/navigation';
import { get } from '@/lib/api';
import { getToken } from '@/lib/session';
import type { CurrentUser } from '@/types/api';

// Re-exported so server components can keep importing from one place.
export { hasRole, isOperator, isReadOnly } from '@/lib/roles';

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
