import type { DueStatus } from '@/types/api';

export interface Tick {
  /** −1 means a full interval overdue or worse; 0 is the due point; 1 is untouched. */
  position: number;
  status: DueStatus;
  label: string;
}

/**
 * The signature element.
 *
 * Every planned task on one scale, so the shape of the backlog is legible
 * before a single number is read: a dense cluster far past due looks nothing
 * like a handful of tasks drifting towards it, and a table of counts cannot
 * show the difference.
 *
 * The axis is proportion of interval, not hours, because a 10-hour check and a
 * 9,000-hour overhaul cannot share an absolute scale.
 */
export function Sounding({
  ticks,
  title = 'Sounding',
  hint,
}: {
  ticks: Tick[];
  title?: string;
  hint?: string;
}) {
  const due = ticks.filter((t) => t.status === 'due').length;
  const soon = ticks.filter((t) => t.status === 'due_soon').length;
  const ok = ticks.filter((t) => t.status === 'on_track').length;

  // Overdue occupies the left 44%, the amber window a narrow band, the rest
  // spreads right. Zones are fixed so the eye learns where the due point sits.
  const place = (tick: Tick): number => {
    if (tick.position <= 0) return (1 + Math.max(tick.position, -1)) * 44;
    if (tick.status === 'due_soon') return 44 + Math.min(tick.position * 24, 1) * 6;
    return 50 + Math.min(tick.position, 1) * 50;
  };

  const colour: Record<DueStatus, string> = {
    due: 'var(--color-danger)',
    due_soon: 'var(--color-caution)',
    on_track: 'var(--color-safe)',
  };

  return (
    <section className="deep-surface relative overflow-hidden rounded-lg px-6 pt-5 pb-3.5 text-white shadow-[inset_0_1px_0_rgba(159,216,222,.16)]">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
        viewBox="0 0 1200 190"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g fill="none" stroke="rgba(207,226,228,.30)" strokeWidth="1">
          <path d="M0,150 C160,132 250,168 400,146 C560,122 660,162 820,138 C960,118 1080,150 1200,132" />
          <path d="M0,116 C170,96 260,132 420,110 C580,88 690,124 840,102 C980,82 1090,112 1200,96" />
          <path d="M0,80 C150,62 280,96 430,74 C590,52 700,86 850,66 C990,48 1100,76 1200,60" />
          <path d="M0,44 C180,28 290,58 440,38 C600,18 720,48 870,30 C1010,14 1110,40 1200,26" />
        </g>
      </svg>

      <div className="relative flex flex-wrap items-baseline gap-3.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint ? <p className="text-[13px] text-shoal/75">{hint}</p> : null}
        <div className="ml-auto flex gap-4 text-[12.5px] text-shoal/85">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-sm bg-danger" aria-hidden /> Due
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-sm bg-caution" aria-hidden /> Due soon
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-sm bg-safe" aria-hidden /> On track
          </span>
        </div>
      </div>

      <div className="relative mt-3.5 h-[118px]">
        <div className="absolute top-0 bottom-[22px] left-0 w-[44%] rounded bg-danger/20" />
        <div className="absolute top-0 bottom-[22px] left-[44%] w-[6%] rounded bg-caution/22" />
        <div className="absolute top-0 bottom-[22px] left-[50%] w-[50%] rounded bg-safe/16" />
        <div className="absolute top-0 bottom-[22px] left-[44%] w-px bg-shoal/35" />
        <div className="absolute top-0 bottom-[22px] left-[50%] w-px bg-shoal/35" />

        <p className="font-cond absolute top-1.5 left-3 text-[12.5px] font-semibold tracking-wide text-[#FF6FA8]">
          Overdue
        </p>
        <p className="font-cond absolute top-[22px] left-3 text-[27px] leading-none font-bold">{due}</p>

        <p className="font-cond absolute top-1.5 left-[calc(44%+10px)] text-[12.5px] font-semibold tracking-wide text-[#F2A93B]">
          Soon
        </p>
        <p className="font-cond absolute top-[22px] left-[calc(44%+10px)] text-[27px] leading-none font-bold">
          {soon}
        </p>

        <p className="font-cond absolute top-1.5 left-[calc(50%+10px)] text-[12.5px] font-semibold tracking-wide text-[#54C79B]">
          On track
        </p>
        <p className="font-cond absolute top-[22px] left-[calc(50%+10px)] text-[27px] leading-none font-bold">
          {ok}
        </p>

        {ticks.map((tick, i) => (
          <span
            key={i}
            title={tick.label}
            className="absolute bottom-[22px] w-[3px] -translate-x-1/2 rounded-sm"
            style={{
              left: `${place(tick)}%`,
              height: `${34 + (i % 5) * 9}px`,
              background: colour[tick.status],
            }}
          />
        ))}

        <div className="absolute right-0 bottom-0 left-0 h-[22px] border-t border-shoal/30">
          <span className="absolute top-1 left-[0.6%] -translate-x-1/2 text-[11.5px] whitespace-nowrap text-shoal/70">
            a full interval past
          </span>
          <span className="absolute top-1 left-[44%] -translate-x-1/2 text-[11.5px] text-shoal/70">due</span>
          <span className="absolute top-1 left-[98.6%] -translate-x-1/2 text-[11.5px] whitespace-nowrap text-shoal/70">
            just done
          </span>
        </div>
      </div>
    </section>
  );
}
