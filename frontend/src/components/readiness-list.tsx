import Link from 'next/link';
import type { ReadinessItem } from '@/lib/overview';

/**
 * What is not yet set up.
 *
 * Each row states the consequence, not just the count: "3 vessels with no
 * operator" is a number, "nobody can record work against them" is a reason to
 * act. Rows at zero are kept and struck through rather than hidden, so the list
 * doubles as the checklist of what setup involves.
 */
export function ReadinessList({ items }: { items: ReadinessItem[] }) {
  const outstanding = items.filter((item) => item.count > 0);
  const done = items.filter((item) => item.count === 0);

  return (
    <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-ink-12 px-5 py-3">
        <h2 className="text-[17px] font-semibold">Setup</h2>
        <p className="text-[13px] text-ink-45">
          {outstanding.length === 0
            ? 'Everything is in place.'
            : `${outstanding.length} of ${items.length} still incomplete`}
        </p>
      </div>

      <ul className="divide-y divide-ink-06">
        {outstanding.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex items-baseline gap-4 px-5 py-3 transition-colors hover:bg-shoal-soft"
            >
              <span className="font-cond w-12 shrink-0 text-[26px] leading-none font-bold text-caution">
                {item.count}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{item.label}</span>
                <span className="block text-[12.5px] text-ink-45">{item.consequence}</span>
              </span>
              <span className="shrink-0 text-[13px] text-ink-45">Open</span>
            </Link>
          </li>
        ))}

        {done.map((item) => (
          <li key={item.key} className="flex items-baseline gap-4 px-5 py-2.5">
            <span className="w-12 shrink-0 text-center text-safe" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="inline h-4 w-4">
                <path d="M4 12.5 9.5 18 20 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 text-[13.5px] text-ink-45">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
