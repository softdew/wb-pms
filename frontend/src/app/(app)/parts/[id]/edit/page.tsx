import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PartForm } from '@/components/part-form';
import { ApiError, get } from '@/lib/api';
import { hasRole, isOperator, requireUser } from '@/lib/auth';
import { loadPart } from '@/lib/parts';
import type { Paginated } from '@/types/api';

export default async function EditPartPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();

  if (isOperator(user) || !hasRole(user, 'department-admin', 'store')) redirect('/parts');

  const { id } = await params;

  let part;
  try {
    part = await loadPart(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const categories = await get<Paginated<{ id: number; name: string }>>('/part-categories', {
    per_page: 200,
  }).catch(() => ({ data: [] }));

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/parts" className="hover:underline">
            Parts catalogue
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          <Link href={`/parts/${part.id}`} className="hover:underline">
            {part.code}
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          Edit
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">{part.name}</h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          Quantities are not edited here. Stock moves by recording a movement.
        </p>
      </header>

      <div className="max-w-3xl px-7 py-6">
        <PartForm part={part} categories={categories.data} />
      </div>
    </>
  );
}
