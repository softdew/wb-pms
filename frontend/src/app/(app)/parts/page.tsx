import Link from 'next/link';
import { IconPart } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';
import { hasRole, isOperator, requireUser } from '@/lib/auth';
import { listParts } from '@/lib/parts';

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requireUser();
  const { search } = await searchParams;

  const parts = await listParts({ search });
  const canManage = hasRole(user, 'department-admin', 'store');
  const operator = isOperator(user);

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">Stores</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">Parts catalogue</h1>
          <p className="pb-1.5 text-[13px] text-ink-45">{parts.total} parts</p>

          {canManage && !operator ? (
            <Link
              href="/parts/new"
              className="ml-auto rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0C3040]"
            >
              Add a part
            </Link>
          ) : null}
        </div>

        {operator ? (
          <p className="mt-1 text-[13px] text-ink-45">
            Maintained by the department. If a part you need is missing, ask for it to be
            added.
          </p>
        ) : null}
      </header>

      <div className="px-7 py-7">
        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <SectionHeader
            icon={IconPart}
            title="Catalogue"
            hint="One catalogue for the fleet. Each operator holds its own stock against it."
            action={
              <form>
              <input
                name="search"
                defaultValue={search}
                placeholder="Search name, code or OEM reference"
                aria-label="Search the catalogue"
                className="w-64 rounded-md border border-ink-22 bg-white px-3 py-1.5 text-sm outline-none focus:border-ink-45"
              />
              </form>
            }
          />

          {parts.data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-cond text-lg font-semibold">
                {search ? 'Nothing matches that search.' : 'The catalogue is empty.'}
              </p>
              <p className="mt-1 text-sm text-ink-45">
                {search
                  ? 'Try a shorter search term.'
                  : 'The department maintains one catalogue; each operator holds its own stock against it.'}
              </p>
              {!search && canManage && !operator ? (
                <Link
                  href="/parts/new"
                  className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3040]"
                >
                  Add the first part
                </Link>
              ) : null}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-shoal-soft">
                  {['Part', 'Category', 'OEM reference', 'Unit', 'Lead time'].map((h) => (
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
                {parts.data.map((part) => (
                  <tr
                    key={part.id}
                    className={`border-b border-ink-06 last:border-0 hover:bg-shoal-soft ${
                      part.is_active ? '' : 'opacity-55'
                    }`}
                  >
                    <td className="px-3.5 py-2.5 align-baseline">
                      <Link href={`/parts/${part.id}`} className="font-medium hover:underline">
                        {part.name}
                      </Link>
                      <p className="text-[12.5px] text-ink-45">
                        {part.code}
                        {part.is_active ? '' : ' · retired'}
                      </p>
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {part.category?.name ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {part.oem_reference ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {part.uom}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {part.lead_time_days > 0 ? `${part.lead_time_days} days` : '—'}
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
