import Link from 'next/link';
import type { AttentionItem } from '@/lib/overview';

/** Things that become problems on a known date. */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  const live = items.filter((item) => item.count > 0);

  return (
    <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
      <div className="border-b border-ink-12 px-5 py-3">
        <h2 className="text-[17px] font-semibold">Needs attention</h2>
      </div>

      {live.length === 0 ? (
        <p className="px-5 py-6 text-center text-[13.5px] text-ink-45">
          Nothing lapsing, nothing waiting.
        </p>
      ) : (
        <ul className="divide-y divide-ink-06">
          {live.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex items-baseline gap-4 px-5 py-3 transition-colors hover:bg-shoal-soft"
              >
                <span
                  className={`absolute left-0 h-6 w-[3px] rounded-r ${
                    item.tone === 'danger' ? 'bg-danger' : 'bg-caution'
                  }`}
                  aria-hidden
                />
                <span
                  className={`font-cond w-12 shrink-0 text-[26px] leading-none font-bold ${
                    item.tone === 'danger' ? 'text-danger' : 'text-caution'
                  }`}
                >
                  {item.count}
                </span>
                <span className="min-w-0 flex-1 text-[14px]">{item.label}</span>
                <span className="shrink-0 text-[13px] text-ink-45">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
