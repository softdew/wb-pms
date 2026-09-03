import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { EquipmentForm } from '@/components/equipment-form';
import { ApiError } from '@/lib/api';
import { hasRole, requireUser } from '@/lib/auth';
import {
  listEquipment,
  loadCategories,
  loadEquipmentRecord,
  loadLocationOptions,
  loadModels,
  loadVesselOptions,
} from '@/lib/equipment';

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin', 'planner')) redirect('/equipment');

  const { id } = await params;

  let equipment;
  try {
    equipment = await loadEquipmentRecord(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [vessels, locations, categories, models, siblings] = await Promise.all([
    loadVesselOptions().catch(() => ({ data: [] })),
    loadLocationOptions().catch(() => ({ data: [] })),
    loadCategories().catch(() => ({ data: [] })),
    loadModels().catch(() => ({ data: [] })),
    listEquipment({
      vessel_id: equipment.vessel_id ?? undefined,
    }).catch(() => ({ data: [] })),
  ]);

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/equipment" className="hover:underline">
            Equipment
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          <Link href={`/equipment/${equipment.id}`} className="hover:underline">
            {equipment.code}
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          Edit
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">{equipment.name}</h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          Criticality and strategy are changed through their own workflows, not here.
        </p>
      </header>

      <div className="max-w-4xl px-7 py-6">
        <EquipmentForm
          equipment={equipment}
          vessels={vessels.data}
          locations={locations.data}
          categories={categories.data}
          models={models.data}
          siblings={siblings.data.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
          }))}
        />
      </div>
    </>
  );
}
