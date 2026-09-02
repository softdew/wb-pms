'use server';

import { redirect } from 'next/navigation';
import { clearToken, getToken, setToken } from '@/lib/session';
import type { CurrentUser } from '@/types/api';

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

export interface LoginState {
  error?: string;
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Enter your email address and password.' };
  }

  const response = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password, device_name: 'web' }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    // The API returns the same message for a wrong password and an unknown
    // address, so this cannot be used to discover which accounts exist.
    return {
      error: body.errors?.email?.[0] ?? body.message ?? 'Could not sign you in.',
    };
  }

  const { token } = (await response.json()) as { token: string; user: CurrentUser };

  await setToken(token);

  redirect('/fleet');
}

export async function signOut(): Promise<void> {
  const token = await getToken();

  if (token) {
    await fetch(`${BASE}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    }).catch(() => undefined);
  }

  await clearToken();
  redirect('/login');
}
