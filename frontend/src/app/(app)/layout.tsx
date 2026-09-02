import { headers } from 'next/headers';
import { Rail, type RailCounts } from '@/components/rail';
import { get } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import type { Paginated } from '@/types/api';

/** Counts shown against the navigation. Failures are silent -- a missing badge
 *  is better than a broken page. */
async function railCounts(): Promise<RailCounts> {
  const count = async (path: string, query?: Record<string, string | number>) => {
    try {
      const page = await get<Paginated<unknown>>(path, { per_page: 1, ...query });

      return page.total;
    } catch {
      return undefined;
    }
  };

  const [workOrders, overdue, vessels, plans] = await Promise.all([
    count('/work-orders', { open_only: 1 }),
    count('/maintenance-plans', { due_status: 'due' }),
    count('/vessels'),
    count('/maintenance-plans'),
  ]);

  return { workOrders, overdue, vessels, plans };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [pathname, counts] = await Promise.all([
    headers().then((h) => h.get('x-pathname') ?? '/fleet'),
    railCounts(),
  ]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[236px_1fr]">
      <div className="hidden lg:block">
        <Rail user={user} current={pathname} counts={counts} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
