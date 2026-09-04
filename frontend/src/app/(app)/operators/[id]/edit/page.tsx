import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { OperatorForm } from '@/components/operator-form';
import { ApiError } from '@/lib/api';
import { hasRole, requireUser } from '@/lib/auth';
import { loadOperator } from '@/lib/operators';

export default async function EditOperatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin')) redirect('/operators');

  const { id } = await params;

  let detail;
  try {
    detail = await loadOperator(Number(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { operator } = detail;

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/operators" className="hover:underline">
            Operating companies
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          <Link href={`/operators/${operator.id}`} className="hover:underline">
            {operator.code}
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          Edit
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">{operator.name}</h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          Logins are issued and withdrawn from the operator record, not here.
        </p>
      </header>

      <div className="max-w-4xl px-7 py-6">
        <OperatorForm operator={operator} />
      </div>
    </>
  );
}
