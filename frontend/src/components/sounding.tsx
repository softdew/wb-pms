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
 * Printed on chart paper rather than deep water. A real Admiralty chart is pale
 * with blue contour lines and only the deepest areas are dark — and the ticks
 * are the information, so they need a ground that lets them stand up rather
 * than one that swallows them.
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
    <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
      <div className="flex flex-wrap items-baseline gap-3.5 border-b border-ink-12 px-5 py-3">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        {hint ? <p className="text-[13px] text-ink-45">{hint}</p> : null}
        <div className="ml-auto flex gap-4 text-[12.5px] text-ink-70">
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

      <div className="px-5 pt-4 pb-3">
        <div className="relative h-[132px]">
          {/* Depth tints. Pale, so the ticks read as marks on paper. */}
          <div className="absolute top-0 bottom-[24px] left-0 w-[44%] rounded-l bg-danger-soft" />
          <div className="absolute top-0 bottom-[24px] left-[44%] w-[6%] bg-caution-soft" />
          <div className="absolute top-0 bottom-[24px] left-[50%] w-[50%] rounded-r bg-safe-soft" />

          {/* Contour lines, as printed on the chart. */}
          <svg
            className="pointer-events-none absolute top-0 right-0 bottom-[24px] left-0 h-[108px] w-full"
            viewBox="0 0 1200 108"
            preserveAspectRatio="none"
            aria-hidden
          >
            <g fill="none" stroke="#4FA8B4" strokeWidth="1" opacity="0.30">
              <path d="M0,88 C160,74 250,100 400,86 C560,70 660,96 820,80 C960,66 1080,88 1200,74" />
              <path d="M0,62 C170,48 260,74 420,60 C580,44 690,70 840,54 C980,40 1090,62 1200,48" />
              <path d="M0,36 C150,24 280,50 430,34 C590,18 700,44 850,28 C990,14 1100,36 1200,22" />
            </g>
          </svg>

          <div className="absolute top-0 bottom-[24px] left-[44%] w-px bg-ink-22" />
          <div className="absolute top-0 bottom-[24px] left-[50%] w-px bg-ink-22" />

          <p className="font-cond absolute top-2 left-3.5 text-[12.5px] font-semibold tracking-wide text-danger">
            Overdue
          </p>
          <p className="font-cond absolute top-[22px] left-3.5 text-[30px] leading-none font-bold">
            {due}
          </p>

          <p className="font-cond absolute top-2 left-[calc(44%+9px)] text-[12.5px] font-semibold tracking-wide text-caution">
            Soon
          </p>
          <p className="font-cond absolute top-[22px] left-[calc(44%+9px)] text-[30px] leading-none font-bold">
            {soon}
          </p>

          <p className="font-cond absolute top-2 left-[calc(50%+10px)] text-[12.5px] font-semibold tracking-wide text-safe">
            On track
          </p>
          <p className="font-cond absolute top-[22px] left-[calc(50%+10px)] text-[30px] leading-none font-bold">
            {ok}
          </p>

          {/* The soundings themselves. */}
          {ticks.map((tick, i) => (
            <span
              key={i}
              title={tick.label}
              className="absolute bottom-[24px] w-[3px] -translate-x-1/2 rounded-t-sm"
              style={{
                left: `${place(tick)}%`,
                height: `${36 + (i % 5) * 9}px`,
                background: colour[tick.status],
              }}
            />
          ))}

          <div className="absolute right-0 bottom-0 left-0 h-[24px] border-t border-ink-22">
            <span className="absolute top-1.5 left-0 text-[11.5px] whitespace-nowrap text-ink-45">
              a full interval past
            </span>
            <span className="absolute top-1.5 left-[44%] -translate-x-1/2 text-[11.5px] font-medium text-ink-70">
              due
            </span>
            <span className="absolute top-1.5 right-0 text-[11.5px] whitespace-nowrap text-ink-45">
              just done
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
