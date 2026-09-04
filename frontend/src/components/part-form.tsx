'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPart, updatePart, type PartResult } from '@/actions/parts';
import type { PartRecord } from '@/lib/part-types';

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

const units = ['nos', 'set', 'litre', 'kg', 'metre', 'pair', 'roll', 'box'];

export function PartForm({
  part,
  categories,
}: {
  part?: PartRecord;
  categories: { id: number; name: string }[];
}) {
  const editing = Boolean(part);
  const action = editing ? updatePart.bind(null, part!.id) : createPart;
  const [state, formAction] = useActionState<PartResult, FormData>(action, {});

  const field =
    'w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45';

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="font-cond text-[19px] font-semibold text-shoal-ink">The part</h2>
          <p className="text-[13px] text-ink-45">
            What the thing is. How many anyone holds is recorded separately, per
            operator, because spares are on the contractor&rsquo;s account.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div>
            <label htmlFor="code" className="mb-1.5 block text-[13px] font-medium">
              Code<span className="ml-1 text-danger">*</span>
            </label>
            <input id="code" name="code" required placeholder="FLT-1040" defaultValue={part?.code} className={field} />
          </div>

          <div>
            <label htmlFor="name" className="mb-1.5 block text-[13px] font-medium">
              Name<span className="ml-1 text-danger">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="Oil filter cartridge, R1040"
              defaultValue={part?.name}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="part_category_id" className="mb-1.5 block text-[13px] font-medium">
              Category
            </label>
            <select
              id="part_category_id"
              name="part_category_id"
              defaultValue={String(part?.part_category_id ?? '')}
              className={field}
            >
              <option value="">Not set</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="oem_reference" className="mb-1.5 block text-[13px] font-medium">
              OEM reference
            </label>
            <input
              id="oem_reference"
              name="oem_reference"
              placeholder="As printed in the manual"
              defaultValue={part?.oem_reference ?? ''}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="uom" className="mb-1.5 block text-[13px] font-medium">
              Unit
            </label>
            <select id="uom" name="uom" defaultValue={part?.uom ?? 'nos'} className={field}>
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lead_time_days" className="mb-1.5 block text-[13px] font-medium">
              Procurement lead time, days
            </label>
            <input
              id="lead_time_days"
              name="lead_time_days"
              type="number"
              min="0"
              placeholder="21"
              defaultValue={part?.lead_time_days ?? 0}
              className={field}
            />
            <p className="mt-1 text-[12px] text-ink-45">
              A work order needing this part is released this many days ahead of its due
              date, so the spare can be on hand.
            </p>
          </div>

          <div>
            <label htmlFor="unit_cost" className="mb-1.5 block text-[13px] font-medium">
              Indicative unit cost
            </label>
            <input
              id="unit_cost"
              name="unit_cost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={part?.unit_cost ?? ''}
              className={field}
            />
            <p className="mt-1 text-[12px] text-ink-45">
              For estimating. Actual cost comes from what the operator paid.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="remarks" className="mb-1.5 block text-[13px] font-medium">
              Remarks
            </label>
            <textarea
              id="remarks"
              name="remarks"
              rows={2}
              defaultValue={part?.remarks ?? ''}
              className={field}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={part?.is_active ?? true}
                className="h-4 w-4 accent-[#06202C]"
              />
              In use
            </label>
            <p className="mt-1 text-[12px] text-ink-45">
              A retired part keeps its stock and its history; it simply cannot be added to
              a new task.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Submit label={editing ? 'Save changes' : 'Add to catalogue'} />
        <a
          href={editing ? `/parts/${part!.id}` : '/parts'}
          className="text-[13.5px] text-ink-45 hover:text-ink hover:underline"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
