'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteMaster, saveMaster, type MasterResult } from '@/actions/masters';
import type { MasterConfig, MasterField, MasterRow } from '@/lib/master-types';

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

function Input({
  field,
  value,
  options,
}: {
  field: MasterField;
  value: unknown;
  options: { value: string; label: string }[];
}) {
  const shared =
    'w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45';

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name={field.name}
          defaultChecked={value === undefined ? true : Boolean(value)}
          className="h-4 w-4 accent-[#06202C]"
        />
        {field.label}
      </label>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        id={field.name}
        name={field.name}
        rows={2}
        placeholder={field.placeholder}
        defaultValue={value ? String(value) : ''}
        className={shared}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        id={field.name}
        name={field.name}
        required={field.required}
        defaultValue={value !== null && value !== undefined ? String(value) : ''}
        className={shared}
      >
        {(field.options ?? options).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={field.name}
      name={field.name}
      type={field.type ?? 'text'}
      required={field.required}
      placeholder={field.placeholder}
      defaultValue={value ? String(value) : ''}
      className={shared}
    />
  );
}

/**
 * One component for seven master tables.
 *
 * The differences between them are data, not code — columns, fields and a line
 * saying why the record matters. Seven near-identical pages would mean seven
 * places to fix the same bug.
 */
export function MasterTable({
  config,
  rows,
  lookups,
  canManage,
}: {
  config: MasterConfig;
  rows: MasterRow[];
  lookups: Record<string, { value: string; label: string }[]>;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<MasterRow | 'new' | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const current = editing === 'new' ? undefined : (editing ?? undefined);

  const save = saveMaster.bind(
    null,
    config.endpoint,
    config.slug,
    current?.id ?? null,
  );
  const [state, action] = useActionState<MasterResult, FormData>(save, {});

  // The form is a client component, so the action needs to be told which
  // fields to read rather than inferring them from the DOM.
  const fieldSpec = JSON.stringify(config.fields.map((f) => ({ name: f.name, type: f.type })));

  if (state.ok && editing !== null) {
    setEditing(null);
  }

  return (
    <div className="space-y-5">
      {editing !== null ? (
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="border-b border-ink-12 px-5 py-3">
            <h2 className="text-[17px] font-semibold">
              {editing === 'new' ? `Add a ${config.singular}` : `Edit ${current?.name ?? config.singular}`}
            </h2>
          </div>

          <form action={action} className="space-y-4 px-5 py-4">
            <input type="hidden" name="__fields" value={fieldSpec} />

            {state.error ? (
              <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
                {state.error}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {config.fields.map((field) => (
                <div key={field.name} className={field.full ? 'sm:col-span-2' : undefined}>
                  {field.type !== 'checkbox' ? (
                    <label htmlFor={field.name} className="mb-1.5 block text-[13px] font-medium">
                      {field.label}
                      {field.required ? <span className="ml-1 text-danger">*</span> : null}
                    </label>
                  ) : null}
                  <Input
                    field={field}
                    value={current?.[field.name]}
                    options={lookups[field.name] ?? []}
                  />
                  {field.hint ? (
                    <p className="mt-1 text-[12px] text-ink-45">{field.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Submit label={editing === 'new' ? 'Add' : 'Save changes'} />
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-[13.5px] text-ink-45 hover:text-ink hover:underline"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">{config.title}</h2>
          <p className="text-[13px] text-ink-45">{rows.length}</p>

          {canManage && editing === null ? (
            <button
              onClick={() => setEditing('new')}
              className="ml-auto rounded-md bg-ink px-3.5 py-1.5 text-[13.5px] font-medium text-white hover:bg-[#0C3040]"
            >
              Add a {config.singular}
            </button>
          ) : null}
        </div>

        {deleteError ? (
          <p role="alert" className="border-b border-ink-12 bg-danger-soft px-5 py-2.5 text-[13px] text-danger">
            {deleteError}
          </p>
        ) : null}

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-cond text-lg font-semibold">Nothing here yet.</p>
            <p className="mt-1 text-sm text-ink-45">{config.purpose}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-shoal-soft">
                {config.columns.map((column) => (
                  <th
                    key={column.key}
                    className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45"
                  >
                    {column.label}
                  </th>
                ))}
                {canManage ? <th className="w-24 border-b border-ink-12" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const retired = row.is_active === false;

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-ink-06 last:border-0 hover:bg-shoal-soft ${
                      retired ? 'opacity-55' : ''
                    }`}
                  >
                    {config.columns.map((column) => {
                      const value = column.render
                        ? column.render(row)
                        : row[column.key] === null || row[column.key] === undefined || row[column.key] === ''
                          ? '—'
                          : String(row[column.key]);

                      return (
                        <td
                          key={column.key}
                          className={`px-3.5 py-2.5 align-baseline text-[13.5px] ${
                            column.muted ? 'text-ink-45' : ''
                          }`}
                        >
                          {value}
                          {column.key === config.columns[0].key && retired ? (
                            <span className="ml-2 text-[12px] text-ink-45">retired</span>
                          ) : null}
                        </td>
                      );
                    })}

                    {canManage ? (
                      <td className="px-3.5 py-2.5 text-right align-baseline">
                        <button
                          onClick={() => setEditing(row)}
                          className="rounded px-2 py-1 text-[13px] text-ink-45 hover:bg-ink hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          disabled={pending}
                          onClick={() => {
                            setDeleteError(null);
                            startTransition(async () => {
                              const result = await deleteMaster(config.endpoint, config.slug, row.id);
                              if (result.error) setDeleteError(result.error);
                            });
                          }}
                          className="rounded px-2 py-1 text-[13px] text-ink-45 hover:bg-danger hover:text-white disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
