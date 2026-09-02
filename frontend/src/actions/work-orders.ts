'use server';

import { revalidatePath } from 'next/cache';
import { post } from '@/lib/api';
import { ApiError } from '@/lib/api';

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

/**
 * A refused domain rule is not a crash.
 *
 * The API returns 422 with a message written to be shown to a user -- a
 * run-to-failure blocked on a hidden failure mode, a close-out missing a code.
 * Those go straight to the screen. Anything else is a fault and says so.
 */
async function run(action: () => Promise<unknown>, path: string): Promise<ActionResult> {
  try {
    await action();
    revalidatePath(path);

    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError && error.isRuleViolation) {
      return { error: error.message };
    }

    if (error instanceof ApiError && error.status === 403) {
      return { error: 'Your role does not allow this.' };
    }

    return { error: 'Could not save that. Try again, or check the API is running.' };
  }
}

export async function releaseWorkOrder(id: number): Promise<ActionResult> {
  return run(() => post(`/work-orders/${id}/release`), `/work-orders/${id}`);
}

export async function startWorkOrder(id: number): Promise<ActionResult> {
  return run(() => post(`/work-orders/${id}/start`), `/work-orders/${id}`);
}

export async function closeWorkOrder(id: number): Promise<ActionResult> {
  return run(() => post(`/work-orders/${id}/close`), `/work-orders/${id}`);
}

export async function issueParts(id: number): Promise<ActionResult> {
  return run(() => post(`/work-orders/${id}/issue-parts`), `/work-orders/${id}`);
}

export async function captureReading(
  workOrderId: number,
  readingId: number,
  formData: FormData,
): Promise<ActionResult> {
  const value = formData.get('value');

  if (value === null || value === '') {
    return { error: 'Enter the value that was measured.' };
  }

  return run(
    () =>
      post(`/work-orders/${workOrderId}/readings/${readingId}`, {
        value: Number(value),
        observation: String(formData.get('observation') ?? '') || undefined,
      }),
    `/work-orders/${workOrderId}`,
  );
}

export async function completeWorkOrder(
  id: number,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const required = ['failure_mode', 'cause', 'detection_method', 'severity'] as const;
  const payload: Record<string, unknown> = {};

  for (const field of required) {
    const value = String(formData.get(field) ?? '');

    if (!value) {
      return { error: 'All four close-out codes are required before the job can be completed.' };
    }

    payload[field] = value;
  }

  payload.planned_downtime_hours = Number(formData.get('planned_downtime_hours') ?? 0);
  payload.unplanned_downtime_hours = Number(formData.get('unplanned_downtime_hours') ?? 0);
  payload.acceptance_criteria_met = formData.get('acceptance_criteria_met') === 'on';

  const meter = formData.get('meter_at_completion');
  if (meter) payload.meter_at_completion = Number(meter);

  const cost = formData.get('actual_cost');
  if (cost) payload.actual_cost = Number(cost);

  const observations = String(formData.get('observations') ?? '');
  if (observations) payload.observations = observations;

  return run(() => post(`/work-orders/${id}/complete`, payload), `/work-orders/${id}`);
}
