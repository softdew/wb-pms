import type { FleetView } from '@/lib/fleet';

interface Totals {
  operators: number;
  vessels: number;
  equipment: number;
  plans: number;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * The one thing worth knowing, said first.
 *
 * A dashboard that opens with four equal panels makes the reader decide what
 * matters. The finding goes at the top in the largest type on the page, and the
 * counts sit beside it as supporting detail rather than as the headline they
 * were.
 *
 * Chart paper, tinted to the state. Dark belongs to the rail; a page of dark
 * panels stops being a design and becomes a mood, and the tint carries the
 * urgency perfectly well on its own.
 */
export function FleetHeadline({
  fleet,
  totals,
  organisation,
  outstanding,
}: {
  fleet: FleetView;
  totals?: Totals;
  organisation?: string;
  outstanding: number;
}) {
  const { due, soon, total } = fleet.counts;

  const worst = fleet.vessels
    .flatMap((vessel) => (vessel.worst ? [vessel.worst] : []))
    .sort((a, b) => (a.remaining ?? 0) - (b.remaining ?? 0))[0];

  const vesselsAffected = fleet.vessels.filter((vessel) => vessel.due > 0).length;

  const state = total === 0 ? 'empty' : due > 0 ? 'due' : soon > 0 ? 'soon' : 'clear';

  const look = {
    due: {
      panel: 'border-danger/25 bg-danger-soft',
      headline: 'text-danger',
      contour: 'var(--color-danger)',
    },
    soon: {
      panel: 'border-caution/25 bg-caution-soft',
      headline: 'text-caution',
      contour: 'var(--color-caution)',
    },
    clear: {
      panel: 'border-safe/25 bg-safe-soft',
      headline: 'text-safe',
      contour: 'var(--color-safe)',
    },
    empty: {
      panel: 'border-ink-12 bg-shoal-soft',
      headline: 'text-ink',
      contour: 'var(--color-shoal-deep)',
    },
  }[state];

  const headline =
    state === 'empty'
      ? 'Nothing planned yet'
      : state === 'due'
        ? `${plural(due, 'task', 'tasks')} overdue`
        : state === 'soon'
          ? `${plural(soon, 'task', 'tasks')} due soon`
          : 'Everything on schedule';

  const detail =
    state === 'empty'
      ? 'Register equipment against a vessel, then apply the task library to it.'
      : state === 'due'
        ? [
            `across ${plural(vesselsAffected, 'vessel', 'vessels')}`,
            worst
              ? `oldest ${Math.abs(Math.round(worst.remaining ?? 0)).toLocaleString('en-IN')} ${
                  worst.is_meter_based ? 'hours' : 'days'
                } past due`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : state === 'soon'
          ? 'Nothing has run past its interval.'
          : `${plural(total, 'planned task', 'planned tasks')}, none overdue.`;

  const figures = totals
    ? ([
        ['Operators', totals.operators],
        ['Vessels', totals.vessels],
        ['Equipment', totals.equipment],
        ['Planned tasks', totals.plans],
      ] as const)
    : ([
        ['Vessels', fleet.vessels.length],
        ['Planned tasks', total],
      ] as const);

  return (
    <section className={`relative overflow-hidden rounded-lg border px-7 py-6 ${look.panel}`}>
      {/* Depth contours, as printed on the chart. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g fill="none" stroke={look.contour} strokeWidth="1" opacity="0.20">
          <path d="M0,178 C160,160 250,196 400,174 C560,150 660,190 820,166 C960,146 1080,178 1200,160" />
          <path d="M0,138 C170,118 260,154 420,132 C580,110 690,146 840,124 C980,104 1090,134 1200,118" />
          <path d="M0,98 C150,80 280,114 430,92 C590,70 700,104 850,84 C990,66 1100,94 1200,78" />
          <path d="M0,58 C180,42 290,72 440,52 C600,32 720,62 870,44 C1010,28 1110,54 1200,40" />
        </g>
      </svg>

      <div className="relative flex flex-wrap items-end gap-x-10 gap-y-6">
        <div className="min-w-0">
          {organisation ? (
            <p className="font-cond text-[12px] font-semibold tracking-[0.16em] text-ink-45 uppercase">
              {organisation}
            </p>
          ) : null}

          <h1 className={`font-cond mt-1.5 text-[46px] leading-none font-bold tracking-tight ${look.headline}`}>
            {headline}
          </h1>

          <p className="mt-2 text-[14px] text-ink-70">{detail}</p>

          {outstanding > 0 ? (
            <p className="mt-1 text-[13.5px] text-ink-45">
              {plural(outstanding, 'thing', 'things')} still to set up.
            </p>
          ) : null}
        </div>

        <dl className="ml-auto flex flex-wrap gap-x-9 gap-y-3">
          {figures.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12px] text-ink-45">{label}</dt>
              <dd className="font-cond text-[26px] leading-none font-bold text-ink">
                {value.toLocaleString('en-IN')}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
