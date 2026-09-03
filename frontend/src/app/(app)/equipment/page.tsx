import Link from 'next/link';
import { BandBadge } from '@/components/status';
import { hasRole, requireUser } from '@/lib/auth';
import { hours } from '@/lib/format';
import { listEquipment } from '@/lib/equipment';

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; awaiting_criticality?: string }>;
}) {
  const user = await requireUser();
  const { search, awaiting_criticality } = await searchParams;

  const equipment = await listEquipment({
    search,
    awaiting_criticality: awaiting_criticality ? 1 : undefined,
  });

  const canManage = hasRole(user, 'department-admin', 'planner');
  const unbanded = equipment.data.filter((item) => !item.criticality_band).length;

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">Fleet</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">Equipment</h1>
          <p className="pb-1.5 text-[13px] text-ink-45">
            {equipment.total} registered
            {unbanded > 0 ? (
              <span className="text-caution"> · {unbanded} not yet scored</span>
            ) : null}
          </p>

          {canManage ? (
            <Link
              href="/equipment/new"
              className="ml-auto rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0C3040]"
            >
              Register equipment
            </Link>
          ) : null}
        </div>
      </header>

      <div className="px-7 py-6">
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-12 px-4.5 py-3">
            <h2 className="mr-2 text-[17px] font-semibold">Register</h2>

            <Link
              href="/equipment"
              className={`rounded-full border px-3 py-[3px] text-[13px] transition-colors ${
                !awaiting_criticality
                  ? 'border-ink bg-ink text-white'
                  : 'border-ink-22 text-ink-70 hover:bg-shoal-soft'
              }`}
            >
              All
            </Link>
            <Link
              href="/equipment?awaiting_criticality=1"
              className={`rounded-full border px-3 py-[3px] text-[13px] transition-colors ${
                awaiting_criticality
                  ? 'border-ink bg-ink text-white'
                  : 'border-ink-22 text-ink-70 hover:bg-shoal-soft'
              }`}
            >
              Not scored
            </Link>

            <form className="ml-auto">
              <input
                name="search"
                defaultValue={search}
                placeholder="Search name, code or serial"
                aria-label="Search equipment"
                className="w-60 rounded-md border border-ink-22 bg-white px-3 py-1.5 text-sm outline-none focus:border-ink-45"
              />
            </form>
          </div>

          {equipment.data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-cond text-lg font-semibold">
                {search ? 'Nothing matches that search.' : 'No equipment registered yet.'}
              </p>
              <p className="mt-1 text-sm text-ink-45">
                {search
                  ? 'Try a shorter search term.'
                  : 'Register the machinery fitted to each vessel, then apply the task library to it.'}
              </p>
              {!search && canManage ? (
                <Link
                  href="/equipment/new"
                  className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
                >
                  Register the first item
                </Link>
              ) : null}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-shoal-soft">
                  {['Equipment', 'Fitted to', 'Category', 'Meter', 'Criticality', 'Strategy'].map((h) => (
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
                {equipment.data.map((item) => (
                  <tr key={item.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                    <td className="px-3.5 py-2.5 align-baseline">
                      <Link href={`/equipment/${item.id}`} className="font-medium hover:underline">
                        {item.name}
                      </Link>
                      <p className="text-[12.5px] text-ink-45">
                        {item.code}
                        {item.serial_no ? ` · ${item.serial_no}` : ''}
                      </p>
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {item.vessel?.name ?? <span className="text-ink-45">Shore</span>}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {item.category?.name ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {item.meter_type ? (
                        <>
                          <span className="font-cond text-[15px] font-semibold">
                            {hours(item.current_meter_reading)}
                          </span>{' '}
                          hrs
                        </>
                      ) : (
                        <span className="text-ink-45">Not metered</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline">
                      <BandBadge band={item.criticality_band} />
                      {item.hidden_failure_flag ? (
                        <p className="mt-1 text-[12px] text-caution">Hidden failure</p>
                      ) : null}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70 capitalize">
                      {item.maintenance_strategy?.replace(/_/g, ' ') ?? (
                        <span className="text-ink-45">Not assigned</span>
                      )}
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
