import Link from 'next/link';
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
 * The one thing worth knowing, said first — and something to do about it.
 *
 * An earlier version put four counts in the corner. They all read "1", they
 * were labelled like a spec sheet, and next to a headline about overdue work
 * they answered a question nobody was asking. Composition matters more than
 * the figures: the finding dominates, the action sits beside it, and the fleet
 * numbers become a footer strip that reads as a sentence rather than a table.
 *
 * Chart paper, tinted to the state. Dark belongs to the left menu.
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
      rule: 'border-danger/20',
      headline: 'text-danger',
      contour: 'var(--color-danger)',
      button: 'bg-danger text-white hover:bg-[#B80856]',
    },
    soon: {
      panel: 'border-caution/25 bg-caution-soft',
      rule: 'border-caution/20',
      headline: 'text-caution',
      contour: 'var(--color-caution)',
      button: 'bg-caution text-white hover:bg-[#A86400]',
    },
    clear: {
      panel: 'border-safe/25 bg-safe-soft',
      rule: 'border-safe/20',
      headline: 'text-safe',
      contour: 'var(--color-safe)',
      button: 'bg-safe text-white hover:bg-[#116E4E]',
    },
    empty: {
      panel: 'border-ink-12 bg-shoal-soft',
      rule: 'border-ink-12',
      headline: 'text-ink',
      contour: 'var(--color-shoal-deep)',
      button: 'bg-ink text-white hover:bg-[#0C3040]',
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

  const action =
    state === 'empty'
      ? { href: '/equipment/new', label: 'Register equipment' }
      : state === 'due'
        ? { href: '/plans?due_status=due', label: 'See what is overdue' }
        : state === 'soon'
          ? { href: '/plans?due_status=due_soon', label: 'See what is coming' }
          : { href: '/work-orders', label: 'Open work orders' };

  // Read as a phrase — "1 vessel", "21 planned tasks" — not as a label above a
  // number. Four counts that all say "1" look like a spec sheet; four short
  // phrases read as a description of the fleet.
  const figures = totals
    ? [
        plural(totals.operators, 'operator', 'operators'),
        plural(totals.vessels, 'vessel', 'vessels'),
        plural(totals.equipment, 'equipment item', 'equipment items'),
        plural(totals.plans, 'planned task', 'planned tasks'),
      ]
    : [
        plural(fleet.vessels.length, 'vessel', 'vessels'),
        plural(total, 'planned task', 'planned tasks'),
      ];

  return (
    <section className={`relative overflow-hidden rounded-lg border ${look.panel}`}>
      {/* Depth contours, as printed on the chart. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g fill="none" stroke={look.contour} strokeWidth="1" opacity="0.18">
          <path d="M0,162 C160,146 250,178 400,158 C560,136 660,172 820,150 C960,132 1080,160 1200,144" />
          <path d="M0,124 C170,106 260,138 420,118 C580,98 690,130 840,110 C980,92 1090,120 1200,106" />
          <path d="M0,86 C150,70 280,100 430,80 C590,60 700,92 850,74 C990,58 1100,84 1200,70" />
          <path d="M0,48 C180,34 290,62 440,44 C600,26 720,54 870,38 C1010,24 1110,48 1200,36" />
        </g>
      </svg>

      <div className="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-5 px-7 pt-6 pb-5">
        <div className="min-w-0">
          {organisation ? (
            <p className="font-cond text-[12px] font-semibold tracking-[0.16em] text-ink-45 uppercase">
              {organisation}
            </p>
          ) : null}

          <h1
            className={`font-cond mt-1.5 text-[52px] leading-[0.95] font-bold tracking-tight ${look.headline}`}
          >
            {headline}
          </h1>

          <p className="mt-2.5 text-[14.5px] text-ink-70">{detail}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {outstanding > 0 ? (
            <Link
              href="#needs-doing"
              className="text-[13.5px] font-medium text-ink-70 underline-offset-4 hover:text-ink hover:underline"
            >
              {plural(outstanding, 'thing', 'things')} still to set up
            </Link>
          ) : null}

          <Link
            href={action.href}
            className={`rounded-md px-4 py-2.5 text-[14px] font-medium transition-colors ${look.button}`}
          >
            {action.label}
          </Link>
        </div>
      </div>

      {/* The fleet in one line, divided rather than floating. */}
      <div className={`relative flex flex-wrap border-t ${look.rule}`}>
        {figures.map((figure, index) => (
          <p
            key={figure}
            className={`px-7 py-3 text-[13.5px] text-ink-70 ${
              index > 0 ? `border-l ${look.rule}` : ''
            }`}
          >
            <span className="font-cond mr-1.5 text-[17px] font-bold text-ink">
              {figure.split(' ')[0]}
            </span>
            {figure.split(' ').slice(1).join(' ')}
          </p>
        ))}
      </div>
    </section>
  );
}
