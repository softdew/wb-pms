'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, post } from '@/lib/api';

export interface PlanResult {
  error?: string;
  ok?: boolean;
}

async function run(action: () => Promise<unknown>): Promise<PlanResult> {
  try {
    await action();
    revalidatePath('/plans');
    revalidatePath('/fleet');

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

/**
 * Suspending stops a plan line generating work without deleting it. The history
 * of what has been done against it stays intact, which is why suspend exists
 * rather than delete.
 */
export async function suspendPlan(id: number): Promise<PlanResult> {
  return run(() => post(`/maintenance-plans/${id}/suspend`));
}

export async function resumePlan(id: number): Promise<PlanResult> {
  return run(() => post(`/maintenance-plans/${id}/resume`));
}

export async function raiseFromPlan(id: number): Promise<PlanResult> {
  return run(() => post('/work-orders/from-plan', { maintenance_plan_id: id }));
}
