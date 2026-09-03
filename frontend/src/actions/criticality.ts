'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, post } from '@/lib/api';

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

async function run(action: () => Promise<unknown>, ...paths: string[]): Promise<ActionResult> {
  try {
    await action();
    for (const path of paths) revalidatePath(path);

    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError && error.isRuleViolation) {
      return { error: error.message };
    }

    if (error instanceof ApiError && error.status === 403) {
      return { error: 'Your role does not allow this. Scoring and approval are held separately.' };
    }

    return { error: 'Could not save that. Try again, or check the API is running.' };
  }
}

export async function scoreEquipment(
  equipmentId: number,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const factors = {
    consequence_c: Number(formData.get('consequence_c')),
    exposure_e: Number(formData.get('exposure_e')),
    redundancy_r: Number(formData.get('redundancy_r')),
  };

  if (!factors.consequence_c || !factors.exposure_e || !factors.redundancy_r) {
    return { error: 'Score all three factors before submitting.' };
  }

  const result = await run(
    () =>
      post(`/equipment/${equipmentId}/criticality`, {
        ...factors,
        justification: String(formData.get('justification') ?? '') || undefined,
        review_trigger: String(formData.get('review_trigger') ?? 'initial'),
      }),
    '/criticality',
    `/equipment/${equipmentId}`,
  );

  if (result.ok) redirect('/criticality');

  return result;
}

export async function approveAssessment(id: number): Promise<ActionResult> {
  return run(() => post(`/criticality/${id}/approve`), '/criticality', '/fleet');
}

export async function rejectAssessment(id: number, formData: FormData): Promise<ActionResult> {
  const reason = String(formData.get('reason') ?? '').trim();

  if (!reason) {
    return { error: 'Say why it is being sent back, so the assessor can act on it.' };
  }

  return run(() => post(`/criticality/${id}/reject`, { reason }), '/criticality');
}
