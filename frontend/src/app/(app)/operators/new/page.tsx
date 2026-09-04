import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OperatorForm } from '@/components/operator-form';
import { hasRole, requireUser } from '@/lib/auth';

export default async function NewOperatorPage() {
  const user = await requireUser();

  if (!hasRole(user, 'department-admin')) redirect('/operators');

  return (
    <>
      <header className="border-b border-ink-12 bg-white shadow-[0_1px_3px_rgba(6,32,44,.05)] px-7 pt-5 pb-4">
        <p className="mb-1.5 text-[13px] text-ink-45">
          <Link href="/operators" className="hover:underline">
            Operating companies
          </Link>
          <span className="mx-1.5 text-ink-22">/</span>
          New
        </p>
        <h1 className="text-[29px] leading-tight font-semibold">Add an operator</h1>
        <p className="mt-1 text-[13.5px] text-ink-45">
          The company and its login are created together, so there is no half-set-up
          operator waiting for someone to notice.
        </p>
      </header>

      <div className="max-w-4xl px-7 py-6">
        <OperatorForm />
      </div>
    </>
  );
}
