import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MasterTable } from '@/components/master-table';
import { hasRole, requireUser } from '@/lib/auth';
import { loadMasterLookups, loadMasterRows, masterFor, masters } from '@/lib/masters';

export default async function MasterPage({
  params,
  searchParams,
}: {
  params: Promise<{ master: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requireUser();
  const { master } = await params;
  const { search } = await searchParams;

  const config = masterFor(master);

  if (!config) notFound();

  const [rows, lookups] = await Promise.all([
    loadMasterRows(config, search).catch(() => ({ data: [] })),
    loadMasterLookups(config),
  ]);

  const canManage = hasRole(user, 'department-admin', 'planner', 'technical-authority');
  const siblings = Object.values(masters);

  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5">
        <p className="text-[13px] text-ink-45">Setup</p>
        <h1 className="text-[29px] leading-tight font-semibold">{config.title}</h1>
        <p className="mt-1 max-w-3xl text-[13.5px] text-ink-45">{config.purpose}</p>

        <nav className="mt-4 flex flex-wrap gap-0.5" aria-label="Master data">
          {siblings.map((sibling) => (
            <Link
              key={sibling.slug}
              href={`/setup/${sibling.slug}`}
              className={`px-3.5 pt-2 pb-2.5 text-sm font-medium ${
                sibling.slug === config.slug
                  ? 'border-b-2 border-danger text-ink'
                  : 'border-b-2 border-transparent text-ink-45 hover:text-ink'
              }`}
            >
              {sibling.title}
            </Link>
          ))}
        </nav>
      </header>

      <div className="px-7 py-6">
        <MasterTable
          config={config}
          rows={rows.data}
          lookups={lookups}
          canManage={canManage}
        />
      </div>
    </>
  );
}
