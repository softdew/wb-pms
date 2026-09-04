import Link from 'next/link';
import { IconIncharge, IconVessel } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';
import { notFound } from 'next/navigation';
import { OperatorAdmin } from '@/components/operator-admin';
import { ApiError } from '@/lib/api';
import { hasRole, requireUser } from '@/lib/auth';
import { date } from '@/lib/format';
import { loadOperator, operatorTypeLabel } from '@/lib/operators';

export default async function OperatorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let detail;
  try {
    detail = await loadOperator(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { operator, vessels, users, incharges } = detail;
  const canManage = hasRole(user, 'department-admin');

  const lapsed = incharges.filter(
    (person) => person.licence_valid_until && new Date(person.licence_valid_until) < new Date(),
  );

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/operators" className="hover:underline">
            Operating companies
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          {operator.code}
        </p>

        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">{operator.name}</h1>

          <dl className="flex flex-wrap gap-6 pb-1">
            <div>
              <dt className="text-[13px] text-ink-45">Type</dt>
              <dd className="font-medium">{operatorTypeLabel[operator.type]}</dd>
            </div>
            {operator.agreement_no ? (
              <div>
                <dt className="text-[13px] text-ink-45">Agreement</dt>
                <dd className="font-medium">{operator.agreement_no}</dd>
              </div>
            ) : null}
            {operator.agreement_to ? (
              <div>
                <dt className="text-[13px] text-ink-45">Held until</dt>
                <dd className="font-medium">{date(operator.agreement_to)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[13px] text-ink-45">Status</dt>
              <dd className={`font-medium ${operator.status === 'active' ? 'text-safe' : 'text-ink-45'}`}>
                {operator.status === 'active' ? 'Active' : 'Ended'}
              </dd>
            </div>
          </dl>

          {canManage ? (
            <Link
              href={`/operators/${operator.id}/edit`}
              className="ml-auto rounded-md border border-ink-22 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-shoal-soft"
            >
              Edit
            </Link>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 px-7 py-7 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <SectionHeader
              icon={IconVessel}
              title="Vessels held"
              hint={`${vessels.length} under this agreement`}
            />

            {vessels.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-ink-45">
                No vessels assigned. Assign them from the vessel record.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    {['Vessel', 'Type', 'Held since', 'Status'].map((h) => (
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
                  {vessels.map((vessel) => (
                    <tr key={vessel.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                      <td className="px-3.5 py-2.5 align-baseline">
                        <Link href={`/vessels/${vessel.id}`} className="font-medium hover:underline">
                          {vessel.name}
                        </Link>
                        <p className="text-[12.5px] text-ink-45">{vessel.code}</p>
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {vessel.ship_type?.name ?? '—'}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                        {date(vessel.operator_from)}
                      </td>
                      <td className="px-3.5 py-2.5 align-baseline text-[13.5px] capitalize">
                        {vessel.status.replace(/_/g, ' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <SectionHeader
              icon={IconIncharge}
              tone={lapsed.length > 0 ? 'caution' : 'shoal'}
              title="Vessel in-charges"
              hint={
                <>
                  {incharges.length} on record
                  {lapsed.length > 0 ? (
                    <span className="text-caution"> · {lapsed.length} with a lapsed licence</span>
                  ) : null}
                </>
              }
            />

            {incharges.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-ink-45">
                None recorded. The operator maintains this list.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-shoal-soft">
                    {['Name', 'Designation', 'Licence', 'Valid until'].map((h) => (
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
                  {incharges.map((person) => {
                    const expired =
                      person.licence_valid_until &&
                      new Date(person.licence_valid_until) < new Date();

                    return (
                      <tr key={person.id} className="border-b border-ink-06 last:border-0">
                        <td className="px-3.5 py-2.5 align-baseline font-medium">{person.name}</td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                          {person.designation ?? '—'}
                        </td>
                        <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                          {person.licence_no ?? '—'}
                        </td>
                        <td className={`px-3.5 py-2.5 align-baseline text-[13.5px] ${expired ? 'text-danger' : 'text-ink-70'}`}>
                          {date(person.licence_valid_until)}
                          {expired ? ' · lapsed' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          {canManage ? (
            <OperatorAdmin operator={operator} hasLogin={users.length > 0} />
          ) : null}

          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <div className="border-b border-ink-12 px-4 py-2.5">
              <h2 className="text-[15px] font-semibold">Logins</h2>
            </div>
            {users.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-caution">
                None issued. The company cannot sign in.
              </p>
            ) : (
              <ul className="divide-y divide-ink-06">
                {users.map((account) => (
                  <li key={account.id} className="px-4 py-2.5">
                    <p className="text-[13.5px] font-medium">{account.email}</p>
                    <p className="text-[12.5px] text-ink-45">
                      {account.last_login_at
                        ? `Last signed in ${date(account.last_login_at)}`
                        : 'Never signed in'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {operator.contact_name || operator.contact_phone || operator.contact_email ? (
            <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
              <div className="border-b border-ink-12 px-4 py-2.5">
                <h2 className="text-[15px] font-semibold">Contact</h2>
              </div>
              <dl className="space-y-2.5 px-4 py-3">
                {operator.contact_name ? (
                  <div>
                    <dt className="text-[12.5px] text-ink-45">
                      {operator.contact_designation ?? 'Contact'}
                    </dt>
                    <dd className="text-[13.5px]">{operator.contact_name}</dd>
                  </div>
                ) : null}
                {operator.contact_phone ? (
                  <div>
                    <dt className="text-[12.5px] text-ink-45">Phone</dt>
                    <dd className="text-[13.5px]">{operator.contact_phone}</dd>
                  </div>
                ) : null}
                {operator.contact_email ? (
                  <div>
                    <dt className="text-[12.5px] text-ink-45">Email</dt>
                    <dd className="text-[13.5px]">{operator.contact_email}</dd>
                  </div>
                ) : null}
                {operator.address ? (
                  <div>
                    <dt className="text-[12.5px] text-ink-45">Address</dt>
                    <dd className="text-[13.5px] whitespace-pre-line">{operator.address}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
