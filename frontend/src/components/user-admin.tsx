'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  createUser,
  resetUserPassword,
  setUserStatus,
  updateUser,
  type UserResult,
} from '@/actions/users';
import { CredentialsPanel } from '@/components/credentials-panel';
import { roleDescription, type ManagedUser, type RoleOption } from '@/lib/user-types';

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

function UserForm({
  user,
  roles,
  trades,
  onDone,
}: {
  user?: ManagedUser;
  roles: RoleOption[];
  trades: { id: number; name: string }[];
  onDone: () => void;
}) {
  const editing = Boolean(user);
  const action = editing ? updateUser.bind(null, user!.id) : createUser;
  const [state, formAction] = useActionState<UserResult, FormData>(action, {});
  const [role, setRole] = useState(user?.role ?? 'planner');

  if (state.ok && state.credentials) {
    return (
      <div className="space-y-4">
        <CredentialsPanel
          email={state.credentials.email}
          password={state.credentials.password}
          operatorName={user?.name ?? 'the new account'}
        />
        <button
          onClick={onDone}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
        >
          Done
        </button>
      </div>
    );
  }

  if (state.ok && editing) {
    onDone();
  }

  const field =
    'w-full rounded-md border border-ink-22 bg-white px-2.5 py-2 text-sm outline-none focus:border-ink-45';

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-[13px] font-medium">
            Name<span className="ml-1 text-danger">*</span>
          </label>
          <input id="name" name="name" required defaultValue={user?.name} className={field} />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">
            Email address<span className="ml-1 text-danger">*</span>
          </label>
          <input id="email" name="email" type="email" required defaultValue={user?.email} className={field} />
        </div>

        <div>
          <label htmlFor="employee_code" className="mb-1.5 block text-[13px] font-medium">
            Employee code
          </label>
          <input
            id="employee_code"
            name="employee_code"
            defaultValue={user?.employee_code ?? ''}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="trade_id" className="mb-1.5 block text-[13px] font-medium">
            Trade
          </label>
          <select id="trade_id" name="trade_id" defaultValue={String(user?.trade?.id ?? '')} className={field}>
            <option value="">Not set</option>
            {trades.map((trade) => (
              <option key={trade.id} value={trade.id}>
                {trade.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="border-t border-ink-12 pt-4">
        <legend className="sr-only">Role</legend>
        <p className="mb-1 text-[13px] font-medium">Role</p>
        <p className="mb-2.5 text-[12.5px] text-ink-45">
          One role per account. Scoring a criticality band and approving one are held
          apart, and that only means something if a person cannot hold both.
        </p>

        <div className="space-y-1.5">
          {roles.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2 transition-colors ${
                role === option.value
                  ? 'border-ink bg-shoal-soft'
                  : 'border-ink-12 hover:border-ink-22 hover:bg-shoal-soft/60'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                className="sr-only"
              />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium">{option.label}</span>
                <span className="block text-[12.5px] text-ink-45">
                  {roleDescription[option.value]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {!editing ? (
        <div className="max-w-sm">
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium">
            Password
          </label>
          <input id="password" name="password" className={field} />
          <p className="mt-1 text-[12px] text-ink-45">
            At least 10 characters. Generated and shown once if left blank.
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit label={editing ? 'Save changes' : 'Create account'} />
        <button
          type="button"
          onClick={onDone}
          className="text-[13.5px] text-ink-45 hover:text-ink hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function UserAdmin({
  users,
  roles,
  trades,
  currentUserId,
}: {
  users: ManagedUser[];
  roles: RoleOption[];
  trades: { id: number; name: string }[];
  currentUserId: number;
}) {
  const [editing, setEditing] = useState<ManagedUser | 'new' | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);

  const department = users.filter((user) => !user.operator);
  const operators = users.filter((user) => user.operator);

  const act = (action: () => Promise<UserResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      if (result.credentials) setIssued(result.credentials);
    });
  };

  if (issued) {
    return (
      <div className="space-y-4">
        <CredentialsPanel
          email={issued.email}
          password={issued.password}
          operatorName="this account"
        />
        <button
          onClick={() => setIssued(null)}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {editing !== null ? (
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="border-b border-ink-12 px-5 py-3">
            <h2 className="text-[17px] font-semibold">
              {editing === 'new' ? 'Add an account' : `Edit ${editing.name}`}
            </h2>
          </div>
          <div className="px-5 py-4">
            <UserForm
              user={editing === 'new' ? undefined : editing}
              roles={roles}
              trades={trades}
              onDone={() => setEditing(null)}
            />
          </div>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
        <div className="flex flex-wrap items-baseline gap-3 border-b border-ink-12 px-5 py-3">
          <h2 className="text-[17px] font-semibold">Department accounts</h2>
          <p className="text-[13px] text-ink-45">{department.length}</p>

          {editing === null ? (
            <button
              onClick={() => setEditing('new')}
              className="ml-auto rounded-md bg-ink px-3.5 py-1.5 text-[13.5px] font-medium text-white hover:bg-[#0C3040]"
            >
              Add an account
            </button>
          ) : null}
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-shoal-soft">
              {['Name', 'Role', 'Trade', 'Last signed in', ''].map((h, i) => (
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
            {department.map((user) => {
              const suspended = user.status !== 'active';
              const self = user.id === currentUserId;

              return (
                <tr
                  key={user.id}
                  className={`border-b border-ink-06 last:border-0 hover:bg-shoal-soft ${
                    suspended ? 'opacity-55' : ''
                  }`}
                >
                  <td className="px-3.5 py-2.5 align-baseline">
                    <p className="font-medium">
                      {user.name}
                      {self ? <span className="ml-2 text-[12px] text-ink-45">you</span> : null}
                    </p>
                    <p className="text-[12.5px] text-ink-45">
                      {user.email}
                      {user.employee_code ? ` · ${user.employee_code}` : ''}
                      {suspended ? ' · suspended' : ''}
                    </p>
                  </td>
                  <td className="px-3.5 py-2.5 align-baseline text-[13.5px]">
                    {roles.find((r) => r.value === user.role)?.label ?? (
                      <span className="text-caution">No role</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                    {user.trade?.name ?? '—'}
                  </td>
                  <td className="px-3.5 py-2.5 align-baseline text-[13px] text-ink-45">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Never'}
                  </td>
                  <td className="px-3.5 py-2.5 text-right align-baseline">
                    <button
                      onClick={() => setEditing(user)}
                      className="rounded px-2 py-1 text-[13px] text-ink-45 hover:bg-ink hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => act(() => resetUserPassword(user.id, user.email))}
                      className="rounded px-2 py-1 text-[13px] text-ink-45 hover:bg-ink hover:text-white disabled:opacity-50"
                    >
                      Reset password
                    </button>
                    {!self ? (
                      <button
                        disabled={pending}
                        onClick={() => act(() => setUserStatus(user.id, !suspended))}
                        className="rounded px-2 py-1 text-[13px] text-ink-45 hover:bg-ink hover:text-white disabled:opacity-50"
                      >
                        {suspended ? 'Reinstate' : 'Suspend'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {operators.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="flex flex-wrap items-baseline gap-3 border-b border-ink-12 px-5 py-3">
            <h2 className="text-[17px] font-semibold">Operator logins</h2>
            <p className="text-[13px] text-ink-45">
              One account per operating company. Issued and withdrawn from the operator
              record, not here.
            </p>
          </div>

          <ul className="divide-y divide-ink-06">
            {operators.map((user) => (
              <li key={user.id} className="flex flex-wrap items-baseline gap-3 px-5 py-2.5">
                <span className="text-[13.5px] font-medium">{user.operator?.name}</span>
                <span className="text-[12.5px] text-ink-45">{user.email}</span>
                <span className="ml-auto text-[12.5px] text-ink-45">
                  {user.last_login_at ? 'Has signed in' : 'Never signed in'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
