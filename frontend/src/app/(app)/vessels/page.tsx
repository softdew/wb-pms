import Link from 'next/link';
import { Empty } from '@/components/empty';
import { PageHeader } from '@/components/page-header';
import { VesselStatusBadge } from '@/components/status';
import { get } from '@/lib/api';
import { isOperator, requireUser } from '@/lib/auth';
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

  return (
    <>
      <PageHeader
        title={isOperator(user) ? 'Our vessels' : 'Vessels'}
        crumb="Fleet"
        meta={[{ label: 'In the register', value: String(vessels.total) }]}
      />

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
            <Empty
              title={search ? 'No vessel matches that search.' : 'No vessels in the register yet.'}
              action={search ? 'Try a shorter search term.' : 'Add a vessel to begin.'}
            />
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
                      {date(null)}
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
