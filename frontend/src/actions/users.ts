'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, post, put } from '@/lib/api';

export interface UserResult {
  error?: string;
  ok?: boolean;
  credentials?: { email: string; password: string };
}

async function run(action: () => Promise<unknown>) {
  try {
    const value = await action();
    revalidatePath('/setup/users');

    return { ok: true as const, value };
  } catch (error) {
    if (error instanceof ApiError && (error.isRuleViolation || error.status === 422)) {
      const field = error.errors ? Object.values(error.errors)[0]?.[0] : undefined;

      return { ok: false as const, error: field ?? error.message };
    }

    if (error instanceof ApiError && error.status === 403) {
      return { ok: false as const, error: 'Only a department administrator can manage accounts.' };
    }

    return { ok: false as const, error: 'Could not save that. Try again, or check the API is running.' };
  }
}

export async function createUser(_prev: UserResult, formData: FormData): Promise<UserResult> {
  const email = String(formData.get('email') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();

  if (!name || !email) return { error: 'A name and an email address are required.' };

  const text = (key: string) => String(formData.get(key) ?? '').trim() || undefined;

  const result = await run(() =>
    post<{ password: string }>('/users', {
      name,
      email,
      employee_code: text('employee_code'),
      trade_id: text('trade_id') ? Number(text('trade_id')) : undefined,
      role: text('role'),
      password: text('password'),
    }),
  );

  if (!result.ok) return { error: result.error };

  const created = result.value as { password: string } | undefined;

  return {
    ok: true,
    credentials: created ? { email, password: created.password } : undefined,
  };
}

export async function updateUser(
  id: number,
  _prev: UserResult,
  formData: FormData,
): Promise<UserResult> {
  const text = (key: string) => String(formData.get(key) ?? '').trim() || undefined;

  const result = await run(() =>
    put(`/users/${id}`, {
      name: text('name'),
      email: text('email'),
      employee_code: text('employee_code'),
      trade_id: text('trade_id') ? Number(text('trade_id')) : undefined,
      role: text('role'),
    }),
  );

  return result.ok ? { ok: true } : { error: result.error };
}

export async function resetUserPassword(id: number, email: string): Promise<UserResult> {
  const result = await run(() => post<{ password: string }>(`/users/${id}/reset-password`));

  if (!result.ok) return { error: result.error };

  const reset = result.value as { password: string } | undefined;

  return { ok: true, credentials: reset ? { email, password: reset.password } : undefined };
}

export async function setUserStatus(id: number, suspend: boolean): Promise<UserResult> {
  const result = await run(() =>
    post(`/users/${id}/${suspend ? 'suspend' : 'reinstate'}`),
  );

  return result.ok ? { ok: true } : { error: result.error };
}
