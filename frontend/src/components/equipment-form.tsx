'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createEquipment, updateEquipment, type EquipmentResult } from '@/actions/equipment';
import {
  dutyStatusLabel,
  meterTypeLabel,
  taxonomyHint,
  taxonomyLabel,
  type DutyStatus,
  type EquipmentRecord,
  type MeterType,
  type ModelOption,
  type Option,
  type TaxonomyLevel,
} from '@/lib/equipment-types';

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

export function EquipmentForm({
  equipment,
  vessels,
  locations,
  categories,
  models,
  siblings,
  defaultVesselId,
}: {
  equipment?: EquipmentRecord;
  vessels: Option[];
  locations: Option[];
  categories: Option[];
  models: ModelOption[];
  siblings: { id: number; code: string; name: string }[];
  defaultVesselId?: number;
}) {
  const editing = Boolean(equipment);
  const action = editing ? updateEquipment.bind(null, equipment!.id) : createEquipment;
  const [state, formAction] = useActionState<EquipmentResult, FormData>(action, {});

  const [fittedTo, setFittedTo] = useState<'vessel' | 'shore'>(
    equipment?.location_id && !equipment?.vessel_id ? 'shore' : 'vessel',
  );
  const [level, setLevel] = useState<TaxonomyLevel>(
    equipment?.taxonomy_level ?? 'equipment_unit',
  );
  const [metered, setMetered] = useState(Boolean(equipment?.meter_type));
  const [categoryId, setCategoryId] = useState(String(equipment?.equipment_category_id ?? ''));

  // Models are usually tied to a category, so narrowing them keeps a list of
  // several hundred usable.
  const relevantModels = categoryId
    ? models.filter(
        (m) => !m.equipment_category_id || String(m.equipment_category_id) === categoryId,
      )
    : models;

  const nested = level === 'sub_unit' || level === 'component';

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">Where it is fitted</h2>
          <p className="text-[13px] text-ink-45">
            An item on neither a vessel nor a shore location cannot be found, planned or
            worked on, so one is required.
          </p>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {(['vessel', 'shore'] as const).map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${
                  fittedTo === option
                    ? 'border-ink bg-ink text-white'
                    : 'border-ink-22 hover:bg-shoal-soft'
                }`}
              >
                <input
                  type="radio"
                  checked={fittedTo === option}
                  onChange={() => setFittedTo(option)}
                  className="sr-only"
                />
                {option === 'vessel' ? 'On a vessel' : 'At a ghat or workshop'}
              </label>
            ))}
          </div>

          {fittedTo === 'vessel' ? (
            <div>
              <label htmlFor="vessel_id" className="mb-1.5 block text-[13px] font-medium">
                Vessel<span className="ml-1 text-danger">*</span>
              </label>
              <select
                id="vessel_id"
                name="vessel_id"
                required
                defaultValue={String(equipment?.vessel_id ?? defaultVesselId ?? '')}
                className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
              >
                <option value="">Choose…</option>
                {vessels.map((vessel) => (
                  <option key={vessel.id} value={vessel.id}>
                    {vessel.name} ({vessel.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="location_id" className="mb-1.5 block text-[13px] font-medium">
                Location<span className="ml-1 text-danger">*</span>
              </label>
              <select
                id="location_id"
                name="location_id"
                required
                defaultValue={String(equipment?.location_id ?? '')}
                className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
              >
                <option value="">Choose…</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[12px] text-ink-45">
                Shore equipment stays with the department. Operators do not see it.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">The item</h2>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Field
            name="code"
            label="Code"
            required
            placeholder="MV01-ME-01"
            hint="Short, unique across the register."
            defaultValue={equipment?.code}
          />
          <Field name="name" label="Name" required placeholder="Main Engine" defaultValue={equipment?.name} />

          <div>
            <label htmlFor="equipment_category_id" className="mb-1.5 block text-[13px] font-medium">
              Category
            </label>
            <select
              id="equipment_category_id"
              name="equipment_category_id"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
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
              Decides which library tasks can be applied to it.
            </p>
          </div>

          <div>
            <label htmlFor="equipment_model_id" className="mb-1.5 block text-[13px] font-medium">
              Make and model
            </label>
            <select
              id="equipment_model_id"
              name="equipment_model_id"
              defaultValue={String(equipment?.equipment_model_id ?? '')}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            >
              <option value="">Not set</option>
              {relevantModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.make} {model.model}
                </option>
              ))}
            </select>
          </div>

          <Field
            name="serial_no"
            label="Serial number"
            placeholder="KOEL-R1040-44718"
            defaultValue={equipment?.serial_no}
          />

          <div>
            <label htmlFor="duty_status" className="mb-1.5 block text-[13px] font-medium">
              Duty
            </label>
            <select
              id="duty_status"
              name="duty_status"
              defaultValue={equipment?.duty_status ?? 'duty'}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            >
              {(Object.keys(dutyStatusLabel) as DutyStatus[]).map((value) => (
                <option key={value} value={value}>
                  {dutyStatusLabel[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">Where it sits in the hierarchy</h2>
          <p className="text-[13px] text-ink-45">
            Most items stop at equipment unit. Go deeper only where failure is attributed
            at that level.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="taxonomy_level" className="mb-1.5 block text-[13px] font-medium">
              Level
            </label>
            <select
              id="taxonomy_level"
              name="taxonomy_level"
              value={level}
              onChange={(event) => setLevel(event.target.value as TaxonomyLevel)}
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            >
              {(Object.keys(taxonomyLabel) as TaxonomyLevel[]).map((value) => (
                <option key={value} value={value}>
                  {taxonomyLabel[value]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[12px] text-ink-45">{taxonomyHint[level]}</p>
          </div>

          {nested ? (
            <div className="sm:col-span-2">
              <label htmlFor="parent_id" className="mb-1.5 block text-[13px] font-medium">
                Part of
              </label>
              <select
                id="parent_id"
                name="parent_id"
                defaultValue={String(equipment?.parent_id ?? '')}
                className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
              >
                <option value="">Not set</option>
                {siblings
                  .filter((item) => item.id !== equipment?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">Meter</h2>
          <p className="text-[13px] text-ink-45">
            Without a meter, only calendar, condition, event and statutory tasks can be
            planned against it.
          </p>
        </div>

        <div className="px-5 py-4">
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={metered}
              onChange={(event) => setMetered(event.target.checked)}
              className="h-4 w-4 accent-[#06202C]"
            />
            This item has a meter
          </label>

          {metered ? (
            <div className="max-w-sm">
              <label htmlFor="meter_type" className="mb-1.5 block text-[13px] font-medium">
                Counting
              </label>
              <select
                id="meter_type"
                name="meter_type"
                defaultValue={equipment?.meter_type ?? 'running_hours'}
                className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
              >
                {(Object.keys(meterTypeLabel) as MeterType[]).map((value) => (
                  <option key={value} value={value}>
                    {meterTypeLabel[value]}
                  </option>
                ))}
              </select>
              {editing && equipment?.current_meter_reading ? (
                <p className="mt-1 text-[12px] text-ink-45">
                  Currently at {Number(equipment.current_meter_reading).toLocaleString('en-IN')}.
                  Readings are recorded on the item, not edited here.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">Register details</h2>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Field name="installation_date" label="Installed" type="date" defaultValue={equipment?.installation_date} />
          <Field name="last_renewal_date" label="Last renewed" type="date" defaultValue={equipment?.last_renewal_date} />
          <Field name="warranty_expiry_date" label="Warranty expires" type="date" defaultValue={equipment?.warranty_expiry_date} />
          <Field
            name="replacement_value"
            label="Replacement value"
            type="number"
            placeholder="0"
            hint="Compared against lifetime cost to spot an item at end of life."
            defaultValue={equipment?.replacement_value}
          />
          <div className="sm:col-span-2">
            <Field
              name="statutory_item_ref"
              label="Statutory or class survey item"
              placeholder="IV Rules Sch. II, item 4"
              hint="Recording this bars run-to-failure and caps any interval extension."
              defaultValue={equipment?.statutory_item_ref}
            />
          </div>

          <div className="sm:col-span-2 rounded-md border border-ink-12 bg-shoal-soft px-3.5 py-3">
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                name="hidden_failure_flag"
                defaultChecked={equipment?.hidden_failure_flag}
                className="mt-0.5 h-4 w-4 accent-[#06202C]"
              />
              <span>
                <span className="font-medium">Failure would not be evident</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-70">
                  Bilge alarms, fire detection, emergency steering, emergency stops. Nobody
                  would notice this had failed in normal operation, so it can never be run
                  to failure and its interval can never be extended.
                </span>
              </span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="remarks" className="mb-1.5 block text-[13px] font-medium">
              Remarks
            </label>
            <textarea
              id="remarks"
              name="remarks"
              rows={2}
              defaultValue={equipment?.remarks ?? ''}
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Submit label={editing ? 'Save changes' : 'Register and score'} />
        <a
          href={editing ? `/equipment/${equipment!.id}` : '/equipment'}
          className="text-[13.5px] text-ink-45 hover:text-ink hover:underline"
        >
          Cancel
        </a>
      </div>

      {!editing ? (
        <p className="text-[13px] text-ink-45">
          You will be asked to score its criticality next. Nothing can be planned against
          an item with no band.
        </p>
      ) : null}
    </form>
  );
}
