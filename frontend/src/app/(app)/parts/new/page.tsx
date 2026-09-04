import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PartForm } from '@/components/part-form';
import { get } from '@/lib/api';
import { hasRole, isOperator, requireUser } from '@/lib/auth';
import type { Paginated } from '@/types/api';

export default async function NewPartPage() {
  const user = await requireUser();

  if (isOperator(user) || !hasRole(user, 'department-admin', 'store')) redirect('/parts');

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
          New
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">Add a part</h1>
      </header>

      <div className="max-w-3xl px-7 py-6">
        <PartForm categories={categories.data} />
      </div>
    </>
  );
}
