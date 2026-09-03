import Link from 'next/link';
import { VesselStatusBadge } from '@/components/status';
import { get } from '@/lib/api';
import { hasRole, isOperator, requireUser } from '@/lib/auth';
import { date } from '@/lib/format';
import type { Paginated, Vessel } from '@/types/api';

export default async function VesselsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requireUser();
  const { search } = await searchParams;

  // The API scopes this: an operating company receives only the vessels
  // currently assigned to it, so there is no filtering to do here.
  const vessels = await get<Paginated<Vessel>>('/vessels', { search, per_page: 50 });

  const canManage = hasRole(user, 'department-admin', 'planner');
  // A vessel nobody operates cannot be worked on, so it is worth flagging.
  const unassigned = vessels.data.filter((vessel) => !vessel.operator_id).length;

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">Fleet</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">
            {isOperator(user) ? 'Our vessels' : 'Vessels'}
          </h1>
          <p className="pb-1.5 text-[13px] text-ink-45">
            {vessels.total} in the register
            {unassigned > 0 ? (
              <span className="text-caution"> · {unassigned} not assigned to an operator</span>
            ) : null}
          </p>

          {canManage ? (
            <Link
              href="/vessels/new"
              className="ml-auto rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0C3040]"
            >
              Add vessel
            </Link>
          ) : null}
        </div>
      </header>

      <div className="px-7 py-6">
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="flex items-center gap-3 border-b border-ink-12 px-4.5 py-3">
            <h2 className="text-[17px] font-semibold">Register</h2>
            <form className="ml-auto">
              <input
                name="search"
                defaultValue={search}
                placeholder="Search name or code"
                aria-label="Search vessels"
                className="w-56 rounded-md border border-ink-22 bg-white px-3 py-1.5 text-sm outline-none focus:border-ink-45"
              />
            </form>
          </div>

          {vessels.data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-cond text-lg font-semibold">
                {search ? 'No vessel matches that search.' : 'No vessels in the register yet.'}
              </p>
              <p className="mt-1 text-sm text-ink-45">
                {search
                  ? 'Try a shorter search term.'
                  : 'The department owns the vessels; who operates each one is recorded separately.'}
              </p>
              {!search && canManage ? (
                <Link
                  href="/vessels/new"
                  className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
                >
                  Add the first vessel
                </Link>
              ) : null}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-shoal-soft">
                  {['Vessel', 'Type', 'Operator', 'In-charge', 'Commissioned', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="border-b border-ink-12 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-ink-45"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vessels.data.map((vessel) => (
                  <tr key={vessel.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                    <td className="px-3.5 py-2.5 align-baseline">
                      <Link href={`/vessels/${vessel.id}`} className="font-medium hover:underline">
                        {vessel.name}
                      </Link>
                      <p className="text-[12.5px] text-ink-45">{vessel.code}</p>
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-ink-70">
                      {vessel.ship_type?.name ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-ink-70">
                      {vessel.operator?.name ?? (
                        <span className="text-caution">Not assigned</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-ink-70">
                      {vessel.incharge?.name ?? <span className="text-ink-45">—</span>}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-ink-70">
                      {date(vessel.commission_date)}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline">
                      <VesselStatusBadge status={vessel.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
