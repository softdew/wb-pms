'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createTask, updateTask, type TaskResult } from '@/actions/tasks';
import {
  intervalUnitLabel,
  triggerClassHint,
  triggerClassLabel,
  type ChecklistTask,
  type IntervalUnit,
  type TriggerClass,
} from '@/lib/task-types';

interface Option {
  id: number;
  code: string;
  name: string;
}

function Field({
  name,
  label,
  hint,
  type = 'text',
  required,
  placeholder,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | null;
  step?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[13px] font-medium">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
      />
      {hint ? <p className="mt-1 text-[12px] text-ink-45">{hint}</p> : null}
    </div>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0C3040] disabled:opacity-50"
    >
      {pending ? 'Saving…' : label}
    </button>
  );
}

export function TaskForm({
  task,
  categories,
  trades,
}: {
  task?: ChecklistTask;
  categories: Option[];
  trades: Option[];
}) {
  const editing = Boolean(task);
  const action = editing ? updateTask.bind(null, task!.id) : createTask;
  const [state, formAction] = useActionState<TaskResult, FormData>(action, {});

  const [trigger, setTrigger] = useState<TriggerClass>(task?.default_trigger_class ?? 'calendar');
  const [unit, setUnit] = useState<IntervalUnit>(
    task?.default_interval_unit ?? (task?.default_trigger_class === 'meter' ? 'hours' : 'months'),
  );

  const scheduled = trigger === 'calendar' || trigger === 'meter' || trigger === 'statutory';

  // A meter task is measured in hours; a calendar task cannot be.
  const units: IntervalUnit[] =
    trigger === 'meter' ? ['hours'] : ['days', 'weeks', 'months', 'years'];

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">The task</h2>
          <p className="text-[13px] text-ink-45">
            Written once and applied to every asset of the category. Write it so it reads
            the same on any engine of that type.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Field name="code" label="Code" required placeholder="ME-OIL" defaultValue={task?.code} />

          <div>
            <label htmlFor="equipment_category_id" className="mb-1.5 block text-[13px] font-medium">
              Applies to category
            </label>
            <select
              id="equipment_category_id"
              name="equipment_category_id"
              defaultValue={String(task?.equipment_category_id ?? '')}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            >
              <option value="">Not set</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[12px] text-ink-45">
              Decides which assets it can be applied to in bulk.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="activity_description" className="mb-1.5 block text-[13px] font-medium">
              What is done<span className="ml-1 text-danger">*</span>
            </label>
            <input
              id="activity_description"
              name="activity_description"
              required
              placeholder="Change engine oil"
              defaultValue={task?.activity_description ?? ''}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>

          <Field
            name="section"
            label="Section"
            placeholder="Main Engine Overhaul"
            hint="Groups tasks on the printed schedule."
            defaultValue={task?.section}
          />
          <Field
            name="sort_order"
            label="Print order"
            type="number"
            placeholder="10"
            hint="Within its section. Leave gaps so tasks can be slotted in later."
            defaultValue={task?.sort_order}
          />

          <div className="sm:col-span-2">
            <Field
              name="controlling_reference"
              label="Controlling reference"
              placeholder="5.1.2"
              hint="OEM manual clause, drawing number or statutory rule. Appears on the work order."
              defaultValue={task?.controlling_reference}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">When it falls due</h2>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 space-y-1.5">
            {(Object.keys(triggerClassLabel) as TriggerClass[]).map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2 transition-colors ${
                  trigger === option
                    ? 'border-ink bg-shoal-soft'
                    : 'border-ink-12 hover:border-ink-22 hover:bg-shoal-soft/60'
                }`}
              >
                <input
                  type="radio"
                  name="default_trigger_class"
                  value={option}
                  checked={trigger === option}
                  onChange={() => {
                    setTrigger(option);
                    setUnit(option === 'meter' ? 'hours' : 'months');
                  }}
                  className="sr-only"
                />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium">
                    {triggerClassLabel[option]}
                  </span>
                  <span className="block text-[12.5px] text-ink-45">
                    {triggerClassHint[option]}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {scheduled ? (
            <div className="grid gap-4 border-t border-ink-12 pt-4 sm:grid-cols-3">
              <Field
                name="default_interval_value"
                label="Every"
                type="number"
                step="any"
                placeholder="500"
                defaultValue={task?.default_interval_value}
              />

              <div>
                <label htmlFor="default_interval_unit" className="mb-1.5 block text-[13px] font-medium">
                  Measured in
                </label>
                <select
                  id="default_interval_unit"
                  name="default_interval_unit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value as IntervalUnit)}
                  className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
                >
                  {units.map((value) => (
                    <option key={value} value={value}>
                      {intervalUnitLabel[value]}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                name="first_interval_value"
                label="First service after"
                type="number"
                step="any"
                placeholder="50"
                hint="Only if the first is sooner than the rest."
                defaultValue={task?.first_interval_value}
              />
            </div>
          ) : (
            <p className="border-t border-ink-12 pt-4 text-[13px] text-ink-45">
              No interval. This task is raised when the condition or event occurs, not on
              a schedule.
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">Doing the work</h2>
          <p className="text-[13px] text-ink-45">
            Standard hours are what the forward schedule is loaded against, and what an
            actual is compared to at close-out.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
          <Field
            name="estimated_hours"
            label="Standard hours"
            type="number"
            step="0.25"
            placeholder="4"
            defaultValue={task?.estimated_hours}
          />

          <div>
            <label htmlFor="trade_id" className="mb-1.5 block text-[13px] font-medium">
              Trade
            </label>
            <select
              id="trade_id"
              name="trade_id"
              defaultValue={String(task?.trade_id ?? '')}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            >
              <option value="">Not set</option>
              {trades.map((trade) => (
                <option key={trade.id} value={trade.id}>
                  {trade.name}
                </option>
              ))}
            </select>
          </div>

          <Field
            name="persons_required"
            label="People needed"
            type="number"
            placeholder="1"
            defaultValue={task?.persons_required}
          />

          <div className="sm:col-span-3">
            <label htmlFor="permits_required" className="mb-1.5 block text-[13px] font-medium">
              Permits required
            </label>
            <input
              id="permits_required"
              name="permits_required"
              placeholder="Enclosed space entry, hot work, electrical isolation"
              defaultValue={task?.permits_required ?? ''}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="safety_instructions" className="mb-1.5 block text-[13px] font-medium">
              Safety instructions
            </label>
            <textarea
              id="safety_instructions"
              name="safety_instructions"
              rows={2}
              defaultValue={task?.safety_instructions ?? ''}
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="acceptance_criteria" className="mb-1.5 block text-[13px] font-medium">
              Acceptance criteria
            </label>
            <textarea
              id="acceptance_criteria"
              name="acceptance_criteria"
              rows={2}
              placeholder="How the work is judged complete."
              defaultValue={task?.acceptance_criteria ?? ''}
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={task?.is_active ?? true}
                className="h-4 w-4 accent-[#06202C]"
              />
              In use
            </label>
            <p className="mt-1 text-[12px] text-ink-45">
              Retired tasks stay on the plans already using them; they simply cannot be
              applied to anything new.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Submit label={editing ? 'Save changes' : 'Create task'} />
        <a
          href={editing ? `/task-library/${task!.id}` : '/task-library'}
          className="text-[13.5px] text-ink-45 hover:text-ink hover:underline"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
