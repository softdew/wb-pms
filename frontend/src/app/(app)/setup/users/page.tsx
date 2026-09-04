import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserAdmin } from '@/components/user-admin';
import { hasRole, requireUser } from '@/lib/auth';
import { loadUsers } from '@/lib/users';
import { masters } from '@/lib/masters';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin')) redirect('/fleet');

  const { search } = await searchParams;
  const payload = await loadUsers(search).catch(() => ({ users: [], roles: [], trades: [] }));

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5">
        <p className="text-[13px] text-ink-45">Setup</p>
        <h1 className="text-[29px] leading-tight font-semibold">Users and roles</h1>
        <p className="mt-1 max-w-3xl text-[13.5px] text-ink-45">
          Accounts for department staff. Each holds one role, which decides what they can
          do. Operator logins are issued from the operator record instead.
        </p>

        <nav className="mt-4 flex flex-wrap gap-0.5" aria-label="Setup">
          {Object.values(masters).map((master) => (
            <Link
              key={master.slug}
              href={`/setup/${master.slug}`}
              className="border-b-2 border-transparent px-3.5 pt-2 pb-2.5 text-sm font-medium text-ink-45 hover:text-ink"
            >
              {master.title}
            </Link>
          ))}
          <span className="border-b-2 border-danger px-3.5 pt-2 pb-2.5 text-sm font-medium text-ink">
            Users and roles
          </span>
        </nav>
      </header>

      <div className="px-7 py-7">
        <UserAdmin
          users={payload.users}
          roles={payload.roles}
          trades={payload.trades}
          currentUserId={user.id}
        />
      </div>
    </>
  );
}
