import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EquipmentForm } from '@/components/equipment-form';
import { hasRole, requireUser } from '@/lib/auth';
import {
  listEquipment,
  loadCategories,
  loadLocationOptions,
  loadModels,
  loadVesselOptions,
} from '@/lib/equipment';

export default async function NewEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ vessel_id?: string }>;
}) {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin', 'planner')) redirect('/equipment');

  const { vessel_id } = await searchParams;

  const [vessels, locations, categories, models, siblings] = await Promise.all([
    loadVesselOptions().catch(() => ({ data: [] })),
    loadLocationOptions().catch(() => ({ data: [] })),
    loadCategories().catch(() => ({ data: [] })),
    loadModels().catch(() => ({ data: [] })),
    listEquipment({ vessel_id: vessel_id ? Number(vessel_id) : undefined }).catch(() => ({ data: [] })),
  ]);

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/equipment" className="hover:underline">
            Equipment
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          New
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">Register equipment</h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          An item absent from the register receives no strategy, no plan and no work
          order. Everything downstream starts here.
        </p>
      </header>

      <div className="max-w-4xl px-7 py-6">
        <EquipmentForm
          vessels={vessels.data}
          locations={locations.data}
          categories={categories.data}
          models={models.data}
          siblings={siblings.data.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
          }))}
          defaultVesselId={vessel_id ? Number(vessel_id) : undefined}
        />
      </div>
    </>
  );
}
