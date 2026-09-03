'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, post, put } from '@/lib/api';

export interface OperatorResult {
  error?: string;
  ok?: boolean;
  /** Shown once, at creation. There is no way to read it back afterwards. */
  credentials?: { email: string; password: string };
}

async function run(action: () => Promise<unknown>, ...paths: string[]) {
  try {
    const value = await action();
    for (const path of paths) revalidatePath(path);

    return { ok: true as const, value };
  } catch (error) {
    if (error instanceof ApiError && (error.isRuleViolation || error.status === 422)) {
      const field = error.errors ? Object.values(error.errors)[0]?.[0] : undefined;

      return { ok: false as const, error: field ?? error.message };
    }

    if (error instanceof ApiError && error.status === 403) {
      return { ok: false as const, error: 'Only a department administrator can do this.' };
    }

    return { ok: false as const, error: 'Could not save that. Try again, or check the API is running.' };
  }
}

/** Pull the operator fields out of a form, dropping blanks. */
function operatorPayload(formData: FormData): Record<string, string | undefined> {
  const text = (key: string) => {
    const value = String(formData.get(key) ?? '').trim();

    return value === '' ? undefined : value;
  };

  return {
    code: text('code'),
    name: text('name'),
    type: text('type') ?? 'cooperative_society',
    agreement_no: text('agreement_no'),
    tender_reference: text('tender_reference'),
    agreement_from: text('agreement_from'),
    agreement_to: text('agreement_to'),
    contact_name: text('contact_name'),
    contact_designation: text('contact_designation'),
    contact_phone: text('contact_phone'),
    contact_email: text('contact_email'),
    address: text('address'),
    remarks: text('remarks'),
  };
}

export async function createOperator(
  _prev: OperatorResult,
  formData: FormData,
): Promise<OperatorResult> {
  const payload = operatorPayload(formData);

  if (!payload.code || !payload.name) {
    return { error: 'A code and a name are required.' };
  }

  const email = String(formData.get('login_email') ?? '').trim() || undefined;
  const password = String(formData.get('login_password') ?? '').trim() || undefined;

  const result = await run(
    () =>
      post<{ password: string | null }>('/operators', {
        ...payload,
        login_email: email,
        login_password: password,
        login_name: payload.name,
      }),
    '/operators',
  );

  if (!result.ok) return { error: result.error };

  const created = result.value as { password: string | null } | undefined;

  return {
    ok: true,
    credentials: email && created?.password ? { email, password: created.password } : undefined,
  };
}

export async function updateOperator(
  id: number,
  _prev: OperatorResult,
  formData: FormData,
): Promise<OperatorResult> {
  const payload = operatorPayload(formData);

  if (!payload.code || !payload.name) {
    return { error: 'A code and a name are required.' };
  }

  const result = await run(
    () => put(`/operators/${id}`, payload),
    '/operators',
    `/operators/${id}`,
  );

  if (!result.ok) return { error: result.error };

  redirect(`/operators/${id}`);
}

export async function suspendOperator(id: number): Promise<OperatorResult> {
  const result = await run(() => post(`/operators/${id}/suspend`), '/operators', `/operators/${id}`);

  return result.ok ? { ok: true } : { error: result.error };
}

export async function reinstateOperator(id: number): Promise<OperatorResult> {
  const result = await run(() => post(`/operators/${id}/reinstate`), '/operators', `/operators/${id}`);

  return result.ok ? { ok: true } : { error: result.error };
}

export async function issueOperatorLogin(
  id: number,
  _prev: OperatorResult,
  formData: FormData,
): Promise<OperatorResult> {
  const email = String(formData.get('email') ?? '').trim();

  if (!email) return { error: 'Enter the email address for the login.' };

  const result = await run(
    () =>
      post<{ password: string }>(`/operators/${id}/login`, {
        email,
        password: String(formData.get('password') ?? '') || undefined,
        name: String(formData.get('name') ?? '') || undefined,
      }),
    `/operators/${id}`,
  );

  if (!result.ok) return { error: result.error };

  const issued = result.value as { password: string } | undefined;

  return { ok: true, credentials: issued ? { email, password: issued.password } : undefined };
}
