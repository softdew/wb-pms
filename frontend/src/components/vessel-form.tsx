'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createVessel, updateVessel, type VesselResult } from '@/actions/vessels';
import {
  operatingZoneLabel,
  vesselStatusLabel,
  type ShipTypeOption,
  type VesselRecord,
  type VesselStatus,
} from '@/lib/vessel-types';

function Field({
  name,
  label,
  hint,
  type = 'text',
  required,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | null;
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

export function VesselForm({
  vessel,
  shipTypes,
}: {
  vessel?: VesselRecord;
  shipTypes: ShipTypeOption[];
}) {
  const editing = Boolean(vessel);
  const action = editing ? updateVessel.bind(null, vessel!.id) : createVessel;
  const [state, formAction] = useActionState<VesselResult, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="font-cond text-[19px] font-semibold text-shoal-ink">The vessel</h2>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Field
            name="code"
            label="Code"
            required
            placeholder="MV01"
            hint="Short, unique. Used on work orders and reports."
            defaultValue={vessel?.code}
          />
          <Field name="name" label="Name" required placeholder="MV Sagarika" defaultValue={vessel?.name} />

          <div>
            <label htmlFor="ship_type_id" className="mb-1.5 block text-[13px] font-medium">
              Ship type
            </label>
            <select
              id="ship_type_id"
              name="ship_type_id"
              defaultValue={vessel?.ship_type_id ?? ''}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            >
              <option value="">Not set</option>
              {shipTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {shipTypes.length === 0 ? (
              <p className="mt-1 text-[12px] text-caution">
                No ship types configured yet.
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="operating_zone" className="mb-1.5 block text-[13px] font-medium">
              Operating zone
            </label>
            <select
              id="operating_zone"
              name="operating_zone"
              defaultValue={vessel?.operating_zone ?? ''}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            >
              <option value="">Not set</option>
              {Object.entries(operatingZoneLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="font-cond text-[19px] font-semibold text-shoal-ink">Registration</h2>
          <p className="text-[13px] text-ink-45">
            As recorded under the Inland Vessels Act and the applicable State rules.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Field
            name="registration_no"
            label="Registration number"
            placeholder="WB-IV-2019-0451"
            defaultValue={vessel?.registration_no}
          />
          <Field name="official_no" label="Official number" defaultValue={vessel?.official_no} />
          <Field
            name="commission_date"
            label="Commissioned"
            type="date"
            hint="Used as the starting point for a task never yet completed."
            defaultValue={vessel?.commission_date}
          />

          {editing ? (
            <div>
              <label htmlFor="status" className="mb-1.5 block text-[13px] font-medium">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={vessel?.status ?? 'active'}
                className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
              >
                {(Object.keys(vesselStatusLabel) as VesselStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {vesselStatusLabel[value]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[12px] text-ink-45">
                Anything but Active puts its open jobs into &ldquo;waiting on asset
                availability&rdquo;.
              </p>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <label htmlFor="remarks" className="mb-1.5 block text-[13px] font-medium">
              Remarks
            </label>
            <textarea
              id="remarks"
              name="remarks"
              rows={2}
              defaultValue={vessel?.remarks ?? ''}
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Submit label={editing ? 'Save changes' : 'Create and assign'} />
        <a
          href={editing ? `/vessels/${vessel!.id}` : '/vessels'}
          className="text-[13.5px] text-ink-45 hover:text-ink hover:underline"
        >
          Cancel
        </a>
      </div>

      {!editing ? (
        <p className="text-[13px] text-ink-45">
          You will be asked who operates it next. A vessel with no operator cannot be
          worked on.
        </p>
      ) : null}
    </form>
  );
}
