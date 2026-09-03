import Link from 'next/link';
import { redirect } from 'next/navigation';
import { VesselForm } from '@/components/vessel-form';
import { hasRole, requireUser } from '@/lib/auth';
import { loadShipTypes } from '@/lib/vessel-admin';

export default async function NewVesselPage() {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin', 'planner')) redirect('/vessels');

  const shipTypes = await loadShipTypes().catch(() => ({ data: [] }));

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/vessels" className="hover:underline">
            Vessels
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          New
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">Add a vessel</h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          The department owns the vessel throughout. Who operates it is recorded
          separately, as a dated agreement.
        </p>
      </header>

      <div className="max-w-4xl px-7 py-6">
        <VesselForm shipTypes={shipTypes.data} />
      </div>
    </>
  );
}
