import Link from 'next/link';

export type VesselTab = 'schedule' | 'equipment' | 'work-orders' | 'history';

const tabs: { key: VesselTab; label: string }[] = [
  { key: 'schedule', label: 'Schedule' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'work-orders', label: 'Work orders' },
  { key: 'history', label: 'Operator history' },
];

/**
 * Tabs as links carrying a query, not client state.
 *
 * Each view needs different data, so switching tab is a fetch either way. Making
 * them real URLs means a tab can be linked to, opened in a new window, and
 * returned to by the back button — none of which is true of a tab that only
 * exists in a component's memory.
 */
export function VesselTabs({
  vesselId,
  current,
  counts,
}: {
  vesselId: number;
  current: VesselTab;
  counts?: Partial<Record<VesselTab, number>>;
}) {
  return (
    <nav className="mt-4 flex flex-wrap gap-0.5" aria-label="Vessel sections">
      {tabs.map((tab) => {
        const active = tab.key === current;
        const count = counts?.[tab.key];

        return (
          <Link
            key={tab.key}
            href={
              tab.key === 'schedule'
                ? `/vessels/${vesselId}`
                : `/vessels/${vesselId}?tab=${tab.key}`
            }
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 border-b-2 px-4 pt-2 pb-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border-danger text-ink'
                : 'border-transparent text-ink-45 hover:text-ink'
            }`}
          >
            {tab.label}
            {count !== undefined && count > 0 ? (
              <span
                className={`font-cond text-[13px] font-semibold ${
                  active ? 'text-ink-70' : 'text-ink-45'
                }`}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
