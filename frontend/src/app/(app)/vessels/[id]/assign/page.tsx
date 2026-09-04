import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AssignForm } from '@/components/assign-form';
import { ApiError } from '@/lib/api';
import { hasRole, requireUser } from '@/lib/auth';
import { date } from '@/lib/format';
import { loadAssignmentHistory, loadAssignmentPreview } from '@/lib/vessel-admin';

export default async function AssignVesselPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin', 'planner')) redirect('/vessels');

  const { id } = await params;

  let preview;
  try {
    preview = await loadAssignmentPreview(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const history = await loadAssignmentHistory(Number(id)).catch(() => []);
  const transferring = preview.current_operator !== null;

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/vessels" className="hover:underline">
            Vessels
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          <Link href={`/vessels/${preview.vessel.id}`} className="hover:underline">
            {preview.vessel.code}
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          {transferring ? 'Transfer' : 'Assign'}
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">
          {transferring ? 'Hand over' : 'Assign'} {preview.vessel.name}
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          Only the assignment moves. The equipment, readings, plans and work orders stay
          with the vessel, because the department owns it throughout.
        </p>
      </header>

      <div className="max-w-4xl space-y-5 px-7 py-6">
        <AssignForm preview={preview} />

        {history.length > 0 ? (
          <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
            <div className="border-b border-ink-12 px-5 py-3">
              <h2 className="font-cond text-[19px] font-semibold text-shoal-ink">
                Who has held this vessel
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-shoal-soft">
                  {['Operator', 'From', 'Until', 'Agreement'].map((h) => (
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
                {history.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-ink-06 last:border-0">
                    <td className="px-3.5 py-2.5 align-baseline font-medium">
                      {assignment.operator?.name ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {date(assignment.assigned_from)}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px]">
                      {assignment.assigned_until ? (
                        <span className="text-ink-70">{date(assignment.assigned_until)}</span>
                      ) : (
                        <span className="font-medium text-safe">Current</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 align-baseline text-[13.5px] text-ink-70">
                      {assignment.agreement_no ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>
    </>
  );
}
