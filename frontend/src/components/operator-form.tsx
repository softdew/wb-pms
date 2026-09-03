'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createOperator, updateOperator, type OperatorResult } from '@/actions/operators';
import { CredentialsPanel } from '@/components/credentials-panel';
import { operatorTypeLabel, type Operator, type OperatorType } from '@/lib/operator-types';

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

/**
 * One form, two modes.
 *
 * Create and edit differ in exactly two ways: the login section only appears on
 * create, and the type cannot be changed afterwards. Keeping them as one
 * component means the next six master-data screens can follow the same shape
 * rather than each inventing its own.
 */
export function OperatorForm({ operator }: { operator?: Operator }) {
  const editing = Boolean(operator);

  const action = editing
    ? updateOperator.bind(null, operator!.id)
    : createOperator;

  const [state, formAction] = useActionState<OperatorResult, FormData>(action, {});
  const [type, setType] = useState<OperatorType>(operator?.type ?? 'cooperative_society');
  const [name, setName] = useState(operator?.name ?? '');

  // The department's own operation is not a contractor: no agreement, no
  // tender reference, no separate login.
  const isDepartment = type === 'department';

  if (state.ok && state.credentials) {
    return (
      <div className="space-y-5">
        <CredentialsPanel
          email={state.credentials.email}
          password={state.credentials.password}
          operatorName={name || 'the operator'}
        />
        <a
          href="/operators"
          className="inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
        >
          Back to operators
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">The company</h2>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[13px] font-medium">Type</p>

            {editing ? (
              <>
                <p className="text-[13.5px]">{operatorTypeLabel[type]}</p>
                <input type="hidden" name="type" value={type} />
                <p className="mt-1 text-[12px] text-ink-45">
                  Type cannot be changed once vessels and records are attached.
                </p>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(Object.keys(operatorTypeLabel) as OperatorType[]).map((option) => (
                  <label
                    key={option}
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${
                      type === option
                        ? 'border-ink bg-ink text-white'
                        : 'border-ink-22 hover:bg-shoal-soft'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={option}
                      checked={type === option}
                      onChange={() => setType(option)}
                      className="sr-only"
                    />
                    {operatorTypeLabel[option]}
                  </label>
                ))}
              </div>
            )}
          </div>

          <Field
            name="code"
            label="Code"
            required
            placeholder="COOP1"
            hint="Short, unique. Used on reports."
            defaultValue={operator?.code}
          />

          <div>
            <label htmlFor="name" className="mb-1.5 block text-[13px] font-medium">
              Name<span className="ml-1 text-danger">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Hooghly Ferry Cooperative Society"
              className="w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>
        </div>
      </section>

      {!isDepartment ? (
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="border-b border-ink-12 px-5 py-3">
            <h2 className="text-[17px] font-semibold">Agreement</h2>
            <p className="text-[13px] text-ink-45">
              Vessels are held under tender for three to five years. Recording the
              reference now means a handover later can cite it.
            </p>
          </div>

          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <Field name="agreement_no" label="Agreement number" placeholder="AGR/2026/11" defaultValue={operator?.agreement_no} />
            <Field name="tender_reference" label="Tender reference" placeholder="TND/2026/07" defaultValue={operator?.tender_reference} />
            <Field name="agreement_from" label="Agreement from" type="date" defaultValue={operator?.agreement_from} />
            <Field name="agreement_to" label="Agreement to" type="date" defaultValue={operator?.agreement_to} />
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">Contact</h2>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Field name="contact_name" label="Contact person" defaultValue={operator?.contact_name} />
          <Field name="contact_designation" label="Designation" placeholder="Secretary" defaultValue={operator?.contact_designation} />
          <Field name="contact_phone" label="Phone" type="tel" defaultValue={operator?.contact_phone} />
          <Field name="contact_email" label="Email" type="email" defaultValue={operator?.contact_email} />
          <div className="sm:col-span-2">
            <label htmlFor="address" className="mb-1.5 block text-[13px] font-medium">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={operator?.address ?? ''}
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="remarks" className="mb-1.5 block text-[13px] font-medium">
              Remarks
            </label>
            <textarea
              id="remarks"
              name="remarks"
              rows={2}
              defaultValue={operator?.remarks ?? ''}
              className="w-full rounded-md border border-ink-22 px-2.5 py-2 text-sm outline-none focus:border-ink-45"
            />
          </div>
        </div>
      </section>

      {!editing && !isDepartment ? (
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="border-b border-ink-12 px-5 py-3">
            <h2 className="text-[17px] font-semibold">Login</h2>
            <p className="text-[13px] text-ink-45">
              One account for the company, not per engineer. A sign-off then identifies
              the contractor. Leave the password blank and one is generated.
            </p>
          </div>

          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <Field name="login_email" label="Email address" type="email" placeholder="office@society.example" />
            <Field name="login_password" label="Password" hint="At least 10 characters. Generated if left blank." />
          </div>
        </section>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit label={editing ? 'Save changes' : 'Create operator and login'} />
        <a
          href={editing ? `/operators/${operator!.id}` : '/operators'}
          className="text-[13.5px] text-ink-45 hover:text-ink hover:underline"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
