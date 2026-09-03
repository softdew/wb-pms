import Link from 'next/link';
import { ApprovalRow } from '@/components/approval-row';
import { BandDistribution } from '@/components/band-distribution';
import { hasRole, requireUser } from '@/lib/auth';
import { loadDistribution, loadPending, loadUnassessed } from '@/lib/criticality';

export default async function CriticalityPage() {
  const user = await requireUser();

  const [pending, distribution, unassessed] = await Promise.all([
    loadPending().catch(() => null),
    loadDistribution().catch(() => null),
    loadUnassessed().catch(() => null),
  ]);

  const canApprove = hasRole(user, 'department-admin', 'technical-authority');

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="text-[13px] text-ink-45">Fleet</p>
        <div className="flex flex-wrap items-end gap-6">
          <h1 className="text-[29px] leading-tight font-semibold">Criticality</h1>
          <p className="pb-1.5 text-[13px] text-ink-45">
            Consequence × Exposure × Redundancy, scored by the technical department and
            ratified separately
          </p>
        </div>
      </header>

      <div className="space-y-5 px-7 py-6">
        {distribution ? <BandDistribution distribution={distribution} /> : null}

        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="flex flex-wrap items-baseline gap-3 border-b border-ink-12 px-5 py-3">
            <h2 className="text-[17px] font-semibold">Awaiting approval</h2>
            <p className="text-[13px] text-ink-45">
              {pending?.total ?? 0} {pending?.total === 1 ? 'assessment' : 'assessments'}
            </p>
            {!canApprove ? (
              <p className="ml-auto text-[13px] text-ink-45">
                Approval sits with the technical authority.
              </p>
            ) : null}
          </div>

          {!pending || pending.data.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-cond text-lg font-semibold">Nothing waiting.</p>
              <p className="mt-1 text-sm text-ink-45">
                Scored assessments appear here for ratification.
              </p>
            </div>
          ) : (
            pending.data.map((assessment) => (
              <ApprovalRow key={assessment.id} assessment={assessment} />
            ))
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="flex flex-wrap items-baseline gap-3 border-b border-ink-12 px-5 py-3">
            <h2 className="text-[17px] font-semibold">Not yet assessed</h2>
            <p className="text-[13px] text-ink-45">
              {unassessed?.total ?? 0} items. Nothing can be planned against them until they
              carry a band.
            </p>
          </div>

          {!unassessed || unassessed.data.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-cond text-lg font-semibold">Every item is banded.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-shoal-soft">
                  {['Equipment', 'Vessel', 'Category', ''].map((h, i) => (
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
                {unassessed.data.map((item) => (
                  <tr key={item.id} className="border-b border-ink-06 last:border-0 hover:bg-shoal-soft">
                    <td className="px-3.5 py-2.5 align-baseline">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-[12.5px] text-ink-45">{item.code}</p>
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {item.vessel?.name ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {item.category?.name ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right align-baseline">
                      <Link
                        href={`/equipment/${item.id}/criticality`}
                        className="rounded-md border border-ink-22 px-3 py-1.5 text-[13px] font-medium hover:bg-shoal-soft"
                      >
                        Score
                      </Link>
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
