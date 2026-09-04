'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, post, put } from '@/lib/api';

export interface TaskResult {
  error?: string;
  ok?: boolean;
  applied?: number;
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
    activity_description: text('activity_description'),
    equipment_category_id: number('equipment_category_id'),
    section: text('section'),
    sort_order: number('sort_order') ?? 0,
    default_interval_value: number('default_interval_value'),
    default_interval_unit: text('default_interval_unit'),
    first_interval_value: number('first_interval_value'),
    default_trigger_class: text('default_trigger_class') ?? 'calendar',
    controlling_reference: text('controlling_reference'),
    estimated_hours: number('estimated_hours'),
    trade_id: number('trade_id'),
    persons_required: number('persons_required'),
    safety_instructions: text('safety_instructions'),
    permits_required: text('permits_required'),
    acceptance_criteria: text('acceptance_criteria'),
    is_active: formData.get('is_active') !== null,
  };
}

export async function createTask(_prev: TaskResult, formData: FormData): Promise<TaskResult> {
  const data = payload(formData);

  if (!data.code || !data.activity_description) {
    return { error: 'A code and a description are required.' };
  }

  const result = await run(() => post<{ id: number }>('/checklist-tasks', data), '/task-library');

  if (!result.ok) return { error: result.error };

  const created = result.value as { id: number };
  redirect(`/task-library/${created.id}`);
}

export async function updateTask(
  id: number,
  _prev: TaskResult,
  formData: FormData,
): Promise<TaskResult> {
  const data = payload(formData);

  if (!data.code || !data.activity_description) {
    return { error: 'A code and a description are required.' };
  }

  const result = await run(() => put(`/checklist-tasks/${id}`, data), '/task-library', `/task-library/${id}`);

  if (!result.ok) return { error: result.error };

  redirect(`/task-library/${id}`);
}

/** Readings are replaced wholesale, so the form always sends the full set. */
export async function saveReadings(
  id: number,
  readings: { parameter: string; unit?: string; minimum?: number; maximum?: number; is_mandatory: boolean }[],
): Promise<TaskResult> {
  const result = await run(
    () => post(`/checklist-tasks/${id}/readings`, { readings }),
    `/task-library/${id}`,
  );

  return result.ok ? { ok: true } : { error: result.error };
}

export async function applyLibrary(equipmentId: number): Promise<TaskResult> {
  const result = await run(
    () => post<{ applied: number }>(`/equipment/${equipmentId}/apply-library`),
    `/equipment/${equipmentId}`,
    '/plans',
    '/fleet',
  );

  if (!result.ok) return { error: result.error };

  const applied = result.value as { applied: number };

  return { ok: true, applied: applied.applied };
}
