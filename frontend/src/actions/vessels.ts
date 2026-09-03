'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, post, put } from '@/lib/api';

export interface VesselResult {
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

function vesselPayload(formData: FormData) {
  const text = (key: string) => {
    const value = String(formData.get(key) ?? '').trim();

    return value === '' ? undefined : value;
  };

  return {
    code: text('code'),
    name: text('name'),
    ship_type_id: text('ship_type_id') ? Number(text('ship_type_id')) : undefined,
    registration_no: text('registration_no'),
    official_no: text('official_no'),
    commission_date: text('commission_date'),
    operating_zone: text('operating_zone'),
    status: text('status'),
    remarks: text('remarks'),
  };
}

export async function createVessel(_prev: VesselResult, formData: FormData): Promise<VesselResult> {
  const payload = vesselPayload(formData);

  if (!payload.code || !payload.name) {
    return { error: 'A code and a name are required.' };
  }

  const result = await run(() => post<{ id: number }>('/vessels', payload), '/vessels', '/fleet');

  if (!result.ok) return { error: result.error };

  const created = result.value as { id: number };

  // Straight to assignment: a vessel with no operator cannot be worked on, so
  // leaving it unassigned is a half-finished job rather than a valid state.
  redirect(`/vessels/${created.id}/assign`);
}

export async function updateVessel(
  id: number,
  _prev: VesselResult,
  formData: FormData,
): Promise<VesselResult> {
  const payload = vesselPayload(formData);

  if (!payload.code || !payload.name) {
    return { error: 'A code and a name are required.' };
  }

  const result = await run(() => put(`/vessels/${id}`, payload), '/vessels', `/vessels/${id}`, '/fleet');

  if (!result.ok) return { error: result.error };

  redirect(`/vessels/${id}`);
}

export async function assignVessel(
  id: number,
  _prev: VesselResult,
  formData: FormData,
): Promise<VesselResult> {
  const operatorId = String(formData.get('operator_id') ?? '');

  if (!operatorId) return { error: 'Choose the operator taking the vessel on.' };

  const text = (key: string) => String(formData.get(key) ?? '').trim() || undefined;

  const result = await run(
    () =>
      post(`/vessels/${id}/assignment`, {
        operator_id: Number(operatorId),
        assigned_from: text('assigned_from'),
        agreement_no: text('agreement_no'),
        tender_reference: text('tender_reference'),
        agreement_to: text('agreement_to'),
        condition_notes: text('condition_notes'),
        remarks: text('remarks'),
      }),
    '/vessels',
    `/vessels/${id}`,
    '/operators',
    '/fleet',
  );

  if (!result.ok) return { error: result.error };

  redirect(`/vessels/${id}`);
}

export async function assignIncharge(id: number, formData: FormData): Promise<VesselResult> {
  const inchargeId = String(formData.get('vessel_incharge_id') ?? '');

  if (!inchargeId) return { error: 'Choose who is in charge.' };

  const result = await run(
    () => post(`/vessels/${id}/incharge`, { vessel_incharge_id: Number(inchargeId) }),
    `/vessels/${id}`,
  );

  return result.ok ? { ok: true } : { error: result.error };
}
