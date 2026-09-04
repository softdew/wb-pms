import { get } from '@/lib/api';
import type { UsersPayload } from '@/lib/user-types';

export type { ManagedUser, RoleOption, UsersPayload } from '@/lib/user-types';
export { roleDescription } from '@/lib/user-types';

export const loadUsers = (search?: string) => get<UsersPayload>('/users', { search });
