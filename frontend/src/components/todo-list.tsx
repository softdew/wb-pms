import Link from 'next/link';
import { IconOverdue } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';
import type { AttentionItem, ReadinessItem } from '@/lib/overview';

type Row = {
  key: string;
  label: string;
  detail?: string;
  count: number;
  href: string;
  tone: 'danger' | 'caution';
};

/**
 * Setup and attention as one list, because to whoever reads this they are the
 * same thing: work the department has to do before anyone else can.
 *
 * Completed setup steps collapse to a single line rather than taking a row
 * each — an empty panel saying "nothing lapsing" earns none of the space it was
 * given.
 */
export function TodoList({
  readiness,
  attention,
}: {
  readiness: ReadinessItem[];
  attention: AttentionItem[];
}) {
  const rows: Row[] = [
    ...readiness
      .filter((item) => item.count > 0)
      .map((item) => ({
        key: item.key,
        label: item.label,
        detail: item.consequence,
        count: item.count,
        href: item.href,
        tone: 'caution' as const,
      })),
    ...attention
      .filter((item) => item.count > 0)
      .map((item) => ({
        key: item.key,
        label: item.label,
        count: item.count,
        href: item.href,
        tone: item.tone,
      })),
  ].sort((a, b) => (a.tone === b.tone ? b.count - a.count : a.tone === 'danger' ? -1 : 1));

  const settled = readiness.filter((item) => item.count === 0);

  if (rows.length === 0) {
    return (
      <section
        id="needs-doing"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-safe/25 bg-safe-soft px-5 py-3.5"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-safe"
          aria-hidden
        >
          <path d="M4 12.5 9.5 18 20 6.5" />
        </svg>
        <p className="text-[14px] font-medium text-safe">
          Setup is complete and nothing is lapsing.
        </p>
      </section>
    );
  }

  return (
    <section id="needs-doing" className="overflow-hidden rounded-lg border border-ink-12 bg-white">
      <SectionHeader
        icon={IconOverdue}
        tone="caution"
        title="Needs doing"
        hint={`${rows.length} ${rows.length === 1 ? 'item' : 'items'} before the system is fully usable`}
      />

      <ul className="grid sm:grid-cols-2">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className={`border-b border-ink-06 ${index % 2 === 0 ? 'sm:border-r sm:border-r-ink-06' : ''}`}
          >
            <Link
              href={row.href}
              className="group relative flex h-full items-start gap-4 py-3.5 pr-4 pl-6 transition-colors hover:bg-shoal-soft"
            >
              <span
                className={`absolute top-3.5 bottom-3.5 left-0 w-[3px] rounded-r ${
                  row.tone === 'danger' ? 'bg-danger' : 'bg-caution'
                }`}
                aria-hidden
              />

              <span
                className={`font-cond w-11 shrink-0 text-[32px] leading-none font-bold ${
                  row.tone === 'danger' ? 'text-danger' : 'text-caution'
                }`}
              >
                {row.count}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{row.label}</span>
                {row.detail ? (
                  <span className="mt-0.5 block text-[12.5px] text-ink-45">{row.detail}</span>
                ) : null}
              </span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-1 h-4 w-4 shrink-0 text-ink-22 transition-colors group-hover:text-ink-45"
                aria-hidden
              >
                <path d="M9 5.5 15.5 12 9 18.5" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>

      {settled.length > 0 ? (
        <p className="flex items-center gap-2 border-t border-ink-12 px-5 py-2.5 text-[12.5px] text-ink-45">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 shrink-0 text-safe"
            aria-hidden
          >
            <path d="M4 12.5 9.5 18 20 6.5" />
          </svg>
          {settled.length} setup {settled.length === 1 ? 'step' : 'steps'} complete:{' '}
          {settled.map((item) => item.label.toLowerCase()).join(', ')}.
        </p>
      ) : null}
    </section>
  );
}
