'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, del, post, put } from '@/lib/api';

export interface MasterResult {
  error?: string;
  ok?: boolean;
}

async function run(action: () => Promise<unknown>, path: string): Promise<MasterResult> {
  try {
    await action();
    revalidatePath(path);

    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError && (error.isRuleViolation || error.status === 422)) {
      const field = error.errors ? Object.values(error.errors)[0]?.[0] : undefined;

      return { error: field ?? error.message };
    }

    if (error instanceof ApiError && error.status === 403) {
      return { error: 'Your role does not allow this.' };
    }

    if (error instanceof ApiError && error.status === 409) {
      return { error: 'Something still uses this record, so it cannot be removed.' };
    }

    return { error: 'Could not save that. Try again, or check the API is running.' };
  }
}

/**
 * Fields arrive as a JSON list so one action serves every master table. A
 * blank text field is sent as null rather than an empty string, so the API's
 * nullable rules behave.
 */
function payload(formData: FormData): Record<string, unknown> {
  const fields = JSON.parse(String(formData.get('__fields') ?? '[]')) as {
    name: string;
    type?: string;
  }[];

  const data: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.type === 'checkbox') {
      data[field.name] = formData.get(field.name) !== null;

      continue;
    }

    const raw = String(formData.get(field.name) ?? '').trim();

    if (raw === '') {
      data[field.name] = null;

      continue;
    }

    data[field.name] = field.type === 'number' ? Number(raw) : raw;
  }

  return data;
}

export async function saveMaster(
  endpoint: string,
  slug: string,
  id: number | null,
  _prev: MasterResult,
  formData: FormData,
): Promise<MasterResult> {
  const data = payload(formData);
  const path = `/setup/${slug}`;

  return run(
    () => (id === null ? post(endpoint, data) : put(`${endpoint}/${id}`, data)),
    path,
  );
}

export async function deleteMaster(
  endpoint: string,
  slug: string,
  id: number,
): Promise<MasterResult> {
  return run(() => del(`${endpoint}/${id}`), `/setup/${slug}`);
}
