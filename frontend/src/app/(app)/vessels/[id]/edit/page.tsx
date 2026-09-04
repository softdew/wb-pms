import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { VesselForm } from '@/components/vessel-form';
import { ApiError } from '@/lib/api';
import { hasRole, requireUser } from '@/lib/auth';
import { loadShipTypes, loadVesselRecord } from '@/lib/vessel-admin';

export default async function EditVesselPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin', 'planner')) redirect('/vessels');

  const { id } = await params;

  let vessel;
  try {
    vessel = await loadVesselRecord(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const shipTypes = await loadShipTypes().catch(() => ({ data: [] }));

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/vessels" className="hover:underline">
            Vessels
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          <Link href={`/vessels/${vessel.id}`} className="hover:underline">
            {vessel.code}
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          Edit
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">{vessel.name}</h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          Operator assignment is a separate, dated action.
        </p>
      </header>

      <div className="max-w-4xl px-7 py-6">
        <VesselForm vessel={vessel} shipTypes={shipTypes.data} />
      </div>
    </>
  );
}
