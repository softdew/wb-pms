import { Rail, type RailCounts } from '@/components/rail';
import { NavProgress } from '@/components/nav-progress';
import { get } from '@/lib/api';
import { requireUser } from '@/lib/auth';

/**
 * One request for the navigation badges rather than four.
 *
 * A failure here is silent: a missing badge is better than a page that will not
 * load because a decorative count timed out.
 */
async function railCounts(): Promise<RailCounts> {
  try {
    return await get<RailCounts>('/nav-counts');
  } catch {
    return {};
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, counts] = await Promise.all([requireUser(), railCounts()]);

  return (
    <>
      <NavProgress />
      <div className="grid min-h-screen lg:grid-cols-[236px_1fr]">
        <div className="hidden lg:block">
          <Rail user={user} counts={counts} />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}