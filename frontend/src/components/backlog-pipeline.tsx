import Link from 'next/link';
import { IconPart, IconSpanner, IconVessel } from '@/components/icons';
import type { BacklogState } from '@/types/api';

export interface BacklogEntry {
  label: string;
  count: number;
  overdue: number;
  oldest_due_on?: string | null;
}

export type BacklogData = Record<BacklogState, BacklogEntry>;

/**
 * Backlog as three constraints, not three counts.
 *
 * The split exists so the blockage reads as labour, procurement or operations
 * rather than hiding in one figure — and so it says whether three jobs have
 * been stuck for two days or for six weeks, which is the part anyone acts on.
 *
 * Light, not dark. The rail and the sounding strip are deep water; everything
 * else is chart paper. Three dark panels on one screen stopped being a design
 * and started being a mood.
 */
const shape: Record<
  BacklogState,
  {
    icon: (p: { className?: string }) => React.ReactElement;
    constraint: string;
    stripe: string;
    disc: string;
    text: string;
    bar: string;
  }
> = {
  ready_to_execute: {
    icon: IconSpanner,
    constraint: 'Nothing in the way but hands',
    stripe: 'bg-safe',
    disc: 'bg-safe-soft text-safe',
    text: 'text-safe',
    bar: 'bg-safe',
  },
  waiting_on_material: {
    icon: IconPart,
    constraint: 'Blocked on spares',
    stripe: 'bg-caution',
    disc: 'bg-caution-soft text-caution',
    text: 'text-caution',
    bar: 'bg-caution',
  },
  waiting_on_asset_availability: {
    icon: IconVessel,
    constraint: 'Blocked on the vessel',
    stripe: 'bg-shoal-deep',
    disc: 'bg-shoal-soft text-shoal-deep',
    text: 'text-shoal-deep',
    bar: 'bg-shoal-deep',
  },
};

const order: BacklogState[] = [
  'ready_to_execute',
  'waiting_on_material',
  'waiting_on_asset_availability',
];

function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;

  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export function BacklogPipeline({ backlog, active }: { backlog: BacklogData; active?: string }) {
  const total = order.reduce((sum, state) => sum + (backlog[state]?.count ?? 0), 0);

  return (
    <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-ink-12 px-5 py-3">
        <h2 className="text-[17px] font-semibold">Backlog</h2>
        <p className="text-[13px] text-ink-45">
          {total === 0
            ? 'Nothing open.'
            : `${total} open ${total === 1 ? 'job' : 'jobs'}, by what is holding them up`}
        </p>
      </div>

      <div className="grid sm:grid-cols-3">
        {order.map((state, index) => {
          const entry = backlog[state] ?? { label: state, count: 0, overdue: 0 };
          const look = shape[state];
          const Icon = look.icon;
          const age = daysSince(entry.oldest_due_on);
          const isActive = active === state;
          const empty = entry.count === 0;

          return (
            <Link
              key={state}
              href={`/work-orders?backlog_state=${state}`}
              className={`relative py-4 pr-5 pl-6 transition-colors ${
                index > 0 ? 'sm:border-l sm:border-ink-12' : ''
              } ${isActive ? 'bg-shoal-soft' : 'hover:bg-shoal-soft'}`}
            >
              {/* The constraint reads before the number does. */}
              <span
                className={`absolute top-4 bottom-4 left-0 w-[3px] rounded-r ${
                  empty ? 'bg-ink-12' : look.stripe
                }`}
                aria-hidden
              />

              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${
                    empty ? 'bg-ink-06 text-ink-45' : look.disc
                  }`}
                  aria-hidden
                >
                  <Icon className="h-[15px] w-[15px]" />
                </span>
                <p className="text-[13.5px] font-medium text-ink-70">{entry.label}</p>
              </div>

              <p className="font-cond mt-2 text-[40px] leading-none font-bold tracking-tight">
                {entry.count}
                {entry.overdue > 0 ? (
                  <span className="ml-2.5 font-sans text-[13px] font-medium text-danger">
                    {entry.overdue} past due
                  </span>
                ) : null}
              </p>

              <p className={`mt-1.5 text-[13px] ${empty ? 'text-ink-45' : look.text}`}>
                {empty
                  ? 'Clear'
                  : age !== null && age > 0
                    ? `Oldest waiting ${age} ${age === 1 ? 'day' : 'days'}`
                    : look.constraint}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Where the work is actually stuck, as one line. */}
      <div className="flex h-1.5 w-full bg-ink-06">
        {order.map((state) => {
          const count = backlog[state]?.count ?? 0;

          return count > 0 ? (
            <span
              key={state}
              className={shape[state].bar}
              style={{ width: `${(count / total) * 100}%` }}
            />
          ) : null;
        })}
      </div>
    </section>
  );
}
