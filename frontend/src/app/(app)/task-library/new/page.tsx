import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import { get } from '@/lib/api';
import { hasRole, requireUser } from '@/lib/auth';
import type { Paginated } from '@/types/api';

interface Option {
  id: number;
  code: string;
  name: string;
}

export default async function NewTaskPage() {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin', 'planner', 'technical-authority')) {
    redirect('/task-library');
  }

  const [categories, trades] = await Promise.all([
    get<Paginated<Option>>('/equipment-categories', { per_page: 200 }).catch(() => ({ data: [] })),
    get<Paginated<Option>>('/trades', { per_page: 100 }).catch(() => ({ data: [] })),
  ]);

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/task-library" className="hover:underline">
            Task library
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          New
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">Write a task</h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          One task applied to many assets. A library of single-use tasks is one nobody
          maintains.
        </p>
      </header>

      <div className="max-w-4xl px-7 py-6">
        <TaskForm categories={categories.data} trades={trades.data} />
      </div>
    </>
  );
}
