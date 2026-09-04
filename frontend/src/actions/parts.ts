'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, post, put } from '@/lib/api';

export interface PartResult {
  error?: string;
  ok?: boolean;
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
      return { ok: false as const, error: 'Your role does not allow this.' };
    }

    return { ok: false as const, error: 'Could not save that. Try again, or check the API is running.' };
  }
}

function payload(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? '').trim() || undefined;

  return {
    code: text('code'),
    name: text('name'),
    part_category_id: text('part_category_id') ? Number(text('part_category_id')) : undefined,
    oem_reference: text('oem_reference'),
    uom: text('uom') ?? 'nos',
    unit_cost: text('unit_cost') ? Number(text('unit_cost')) : undefined,
    lead_time_days: text('lead_time_days') ? Number(text('lead_time_days')) : 0,
    remarks: text('remarks'),
    is_active: formData.get('is_active') !== null,
  };
}

export async function createPart(_prev: PartResult, formData: FormData): Promise<PartResult> {
  const data = payload(formData);

  if (!data.code || !data.name) return { error: 'A code and a name are required.' };

  const result = await run(() => post<{ id: number }>('/parts', data), '/parts');

  if (!result.ok) return { error: result.error };

  redirect('/parts');
}

export async function updatePart(
  id: number,
  _prev: PartResult,
  formData: FormData,
): Promise<PartResult> {
  const data = payload(formData);

  if (!data.code || !data.name) return { error: 'A code and a name are required.' };

  const result = await run(() => put(`/parts/${id}`, data), '/parts', `/parts/${id}`);

  if (!result.ok) return { error: result.error };

  redirect(`/parts/${id}`);
}

/**
 * Stock never moves by direct edit: every change is a ledger entry against one
 * operator's holding, so the balance can always be rebuilt from it.
 */
export async function recordMovement(
  partId: number,
  _prev: PartResult,
  formData: FormData,
): Promise<PartResult> {
  const type = String(formData.get('type') ?? '');
  const quantity = formData.get('quantity');
  const operatorId = String(formData.get('operator_id') ?? '');

  if (!type) return { error: 'Say what kind of movement this is.' };
  if (quantity === null || quantity === '') return { error: 'Enter a quantity.' };
  if (!operatorId) return { error: 'Name the operator whose stock is moving.' };

  const remarks = String(formData.get('remarks') ?? '').trim();

  if (type === 'adjustment' && !remarks) {
    return { error: 'An adjustment needs a reason. It is the only record of why the figure changed.' };
  }

  const result = await run(
    () =>
      post(`/parts/${partId}/movements`, {
        type,
        quantity: Number(quantity),
        operator_id: Number(operatorId),
        reference_no: String(formData.get('reference_no') ?? '') || undefined,
        remarks: remarks || undefined,
      }),
    `/parts/${partId}`,
    '/stock',
    '/fleet',
  );

  return result.ok ? { ok: true } : { error: result.error };
}

export async function setReorderLevel(
  partId: number,
  _prev: PartResult,
  formData: FormData,
): Promise<PartResult> {
  const operatorId = String(formData.get('operator_id') ?? '');

  if (!operatorId) return { error: 'Name the operator.' };

  const level = formData.get('reorder_level');

  const result = await run(
    () =>
      post(`/parts/${partId}/stock-policy`, {
        operator_id: Number(operatorId),
        reorder_level: level === null || level === '' ? null : Number(level),
      }),
    `/parts/${partId}`,
    '/stock',
  );

  return result.ok ? { ok: true } : { error: result.error };
}
