'use client';

import { useState, useTransition } from 'react';
import { applyLibrary } from '@/actions/tasks';
import { IconLibrary } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';
import type { LibraryPreview } from '@/lib/task-types';
import { triggerClassLabel } from '@/lib/task-types';

/**
 * The bulk action that makes onboarding a vessel tractable.
 *
 * Twenty tasks applied in one click rather than twenty forms — but shown first,
 * because applying the wrong library to the wrong engine is tedious to undo and
 * easy to do.
 */
export function ApplyLibrary({ preview }: { preview: LibraryPreview }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  const { equipment, tasks } = preview;

  const toApply = tasks.filter((task) => !task.already_applied && !task.blocked);
  const existing = tasks.filter((task) => task.already_applied);
  const blocked = tasks.filter((task) => task.blocked && !task.already_applied);

  if (applied !== null) {
    return (
      <section className="overflow-hidden rounded-lg border border-safe/30 bg-safe-soft px-5 py-5">
        <h2 className="font-cond text-[19px] font-semibold text-safe">
          {applied} {applied === 1 ? 'task' : 'tasks'} applied to {equipment.name}
        </h2>
        <p className="mt-1 text-[13.5px] text-ink-70">
          Due dates are computed from the reading at the last completion, so tasks never
          yet done will read as due until one is recorded.
        </p>
        <div className="mt-4 flex gap-2">
          <a
            href={`/vessels/${equipment.vessel?.id ?? ''}`}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
          >
            See the schedule
          </a>
          <a
            href="/equipment"
            className="rounded-md border border-ink-22 bg-white px-4 py-2 text-sm font-medium hover:bg-shoal-soft"
          >
            Back to equipment
          </a>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      {!equipment.category ? (
        <section className="rounded-lg border border-caution/30 bg-caution-soft px-5 py-4">
          <p className="text-[13.5px] font-medium text-caution">
            This item has no equipment category.
          </p>
          <p className="mt-1 text-[13px] text-ink-70">
            The library is organised by category, so there is nothing to apply until one
            is set on the item.
          </p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <SectionHeader
          icon={IconLibrary}
          title={`${equipment.category?.name ?? 'No category'} library`}
          hint={
            <>
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              {existing.length > 0 ? ` · ${existing.length} already applied` : ''}
              {blocked.length > 0 ? (
                <span className="text-caution"> · {blocked.length} cannot apply</span>
              ) : null}
            </>
          }
        />

        {tasks.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-cond text-lg font-semibold">Nothing in the library yet.</p>
            <p className="mt-1 text-sm text-ink-45">
              Write the tasks for this category first, then apply them here.
            </p>
            <a
              href="/task-library/new"
              className="mt-4 inline-block rounded-md border border-ink-22 px-4 py-2 text-sm font-medium hover:bg-shoal-soft"
            >
              Add a task
            </a>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-shoal-soft">
                {['Task', 'Trigger', 'Interval', ''].map((h, i) => (
                  <th
                    key={i}
                    className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`border-b border-ink-06 last:border-0 ${
                    task.already_applied || task.blocked ? 'opacity-55' : ''
                  }`}
                >
                  <td className="px-3.5 py-2.5 align-baseline">
                    <p className="font-medium">{task.activity_description}</p>
                    <p className="text-[12.5px] text-ink-45">
                      {task.code}
                      {task.controlling_reference ? ` · Manual ${task.controlling_reference}` : ''}
                      {task.section ? ` · ${task.section}` : ''}
                    </p>
                  </td>
                  <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                    {task.trigger_class ? triggerClassLabel[task.trigger_class] : '—'}
                  </td>
                  <td className="font-cond px-3.5 py-2.5 align-baseline text-[15px] font-semibold">
                    {task.interval_label ?? '—'}
                  </td>
                  <td className="px-3.5 py-2.5 text-right align-baseline text-[13px]">
                    {task.already_applied ? (
                      <span className="text-ink-45">Already applied</span>
                    ) : task.blocked ? (
                      <span className="text-caution">Needs a meter</span>
                    ) : (
                      <span className="text-safe">Will apply</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {blocked.length > 0 ? (
        <p className="rounded-md border border-caution/30 bg-caution-soft px-4 py-3 text-[13px] text-caution">
          {blocked.length} {blocked.length === 1 ? 'task is' : 'tasks are'} measured in
          running hours, and this item has no meter. Set a meter on the item first, or
          leave {blocked.length === 1 ? 'it' : 'them'} out.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending || toApply.length === 0}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await applyLibrary(equipment.id);
              if (result.error) setError(result.error);
              else setApplied(result.applied ?? 0);
            });
          }}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0C3040] disabled:opacity-50"
        >
          {pending
            ? 'Applying…'
            : toApply.length === 0
              ? 'Nothing to apply'
              : `Apply ${toApply.length} ${toApply.length === 1 ? 'task' : 'tasks'}`}
        </button>
        <a
          href={`/equipment/${equipment.id}`}
          className="text-[13.5px] text-ink-45 hover:text-ink hover:underline"
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
