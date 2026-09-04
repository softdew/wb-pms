import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ApplyLibrary } from '@/components/apply-library';
import { ApiError } from '@/lib/api';
import { hasRole, requireUser } from '@/lib/auth';
import { loadLibraryPreview } from '@/lib/tasks';

export default async function ApplyLibraryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin', 'planner', 'technical-authority')) {
    redirect('/equipment');
  }

  const { id } = await params;

  let preview;
  try {
    preview = await loadLibraryPreview(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/equipment" className="hover:underline">
            Equipment
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          <Link href={`/equipment/${preview.equipment.id}`} className="hover:underline">
            {preview.equipment.code}
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          Apply library
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">
          Apply the library to {preview.equipment.name}
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          {preview.equipment.vessel?.name ?? 'Shore equipment'} · every task written for
          this category, applied in one go
        </p>
      </header>

      <div className="max-w-4xl px-7 py-6">
        <ApplyLibrary preview={preview} />
      </div>
    </>
  );
}
