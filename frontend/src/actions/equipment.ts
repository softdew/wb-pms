'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, post, put } from '@/lib/api';

export interface EquipmentResult {
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
  const text = (key: string) => {
    const value = String(formData.get(key) ?? '').trim();

    return value === '' ? undefined : value;
  };

  const number = (key: string) => {
    const value = text(key);

    return value === undefined ? undefined : Number(value);
  };

  return {
    code: text('code'),
    name: text('name'),
    vessel_id: number('vessel_id'),
    location_id: number('location_id'),
    parent_id: number('parent_id'),
    taxonomy_level: text('taxonomy_level'),
    equipment_category_id: number('equipment_category_id'),
    equipment_model_id: number('equipment_model_id'),
    serial_no: text('serial_no'),
    installation_date: text('installation_date'),
    last_renewal_date: text('last_renewal_date'),
    warranty_expiry_date: text('warranty_expiry_date'),
    duty_status: text('duty_status'),
    meter_type: text('meter_type'),
    statutory_item_ref: text('statutory_item_ref'),
    replacement_value: number('replacement_value'),
    hidden_failure_flag: formData.get('hidden_failure_flag') === 'on',
    status: text('status'),
    remarks: text('remarks'),
  };
}

export async function createEquipment(
  _prev: EquipmentResult,
  formData: FormData,
): Promise<EquipmentResult> {
  const data = payload(formData);

  if (!data.code || !data.name) {
    return { error: 'A code and a name are required.' };
  }

  if (!data.vessel_id && !data.location_id) {
    return {
      error:
        'Say where it is fitted. An item on neither a vessel nor a shore location cannot be found or worked on.',
    };
  }

  const result = await run(() => post<{ id: number }>('/equipment', data), '/equipment', '/fleet');

  if (!result.ok) return { error: result.error };

  const created = result.value as { id: number };

  // Straight to scoring: nothing can be planned against an item with no band.
  redirect(`/equipment/${created.id}/criticality`);
}

export async function updateEquipment(
  id: number,
  _prev: EquipmentResult,
  formData: FormData,
): Promise<EquipmentResult> {
  const data = payload(formData);

  if (!data.code || !data.name) {
    return { error: 'A code and a name are required.' };
  }

  const result = await run(
    () => put(`/equipment/${id}`, data),
    '/equipment',
    `/equipment/${id}`,
    '/fleet',
  );

  if (!result.ok) return { error: result.error };

  redirect(`/equipment/${id}`);
}

export async function recordMeterReading(
  id: number,
  _prev: EquipmentResult,
  formData: FormData,
): Promise<EquipmentResult> {
  const value = formData.get('reading_value');

  if (value === null || value === '') {
    return { error: 'Enter the reading.' };
  }

  const result = await run(
    () =>
      post(`/equipment/${id}/meter-readings`, {
        reading_value: Number(value),
        reading_on: String(formData.get('reading_on') ?? '') || undefined,
        is_reset: formData.get('is_reset') === 'on',
        remarks: String(formData.get('remarks') ?? '') || undefined,
      }),
    `/equipment/${id}`,
    '/fleet',
  );

  return result.ok ? { ok: true } : { error: result.error };
}
