/**
 * Placeholders that match the shape of what is loading.
 *
 * A spinner says "wait"; a skeleton says "a table of eight rows is coming",
 * which stops the page jumping when it arrives. Nothing here animates faster
 * than a slow pulse — a busy loader makes a slow page feel slower.
 */
function Bar({ className = '' }: { className?: string }) {
  return <span className={`block animate-pulse rounded bg-ink-06 ${className}`} aria-hidden />;
}

export function PageSkeleton({ rows = 8, filters = true }: { rows?: number; filters?: boolean }) {
  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <Bar className="h-3 w-16" />
        <div className="mt-2.5 flex flex-wrap items-end gap-6">
          <Bar className="h-7 w-56" />
          <Bar className="mb-1 h-3 w-64" />
        </div>
      </header>

      <div className="space-y-5 px-7 py-6">
        {filters ? (
          <div className="flex flex-wrap gap-2 rounded-lg border border-ink-12 bg-white px-4.5 py-3">
            {[64, 52, 76, 64].map((width, i) => (
              <Bar key={i} className="h-6 rounded-full" style={{ width }} />
            ))}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
          <div className="border-b border-ink-12 px-5 py-3">
            <Bar className="h-4 w-40" />
          </div>

          <div className="border-b border-ink-12 bg-shoal-soft px-3.5 py-2.5">
            <Bar className="h-3 w-full max-w-2xl" />
          </div>

          <ul>
            {Array.from({ length: rows }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-8 border-b border-ink-06 px-3.5 py-3.5 last:border-0"
                style={{ opacity: 1 - i * 0.07 }}
              >
                <span className="min-w-0 flex-1">
                  <Bar className="h-3.5 w-2/5" />
                  <Bar className="mt-1.5 h-2.5 w-1/4" />
                </span>
                <Bar className="h-3.5 w-16" />
                <Bar className="h-3.5 w-20" />
                <Bar className="h-3.5 w-24" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

/** For a page whose hero is the sounding strip. */
export function DashboardSkeleton() {
  return (
    <>
      <header className="border-b border-ink-12 bg-white px-7 pt-5 pb-4">
        <Bar className="h-3 w-48" />
        <div className="mt-2.5 flex flex-wrap items-end gap-6">
          <Bar className="h-7 w-44" />
          <Bar className="mb-1 h-3 w-72" />
        </div>
      </header>

      <div className="space-y-5 px-7 py-6">
        <section className="rounded-lg border border-ink-12 bg-white">
          <div className="border-b border-ink-12 px-5 py-3">
            <Bar className="h-4 w-36" />
          </div>
          <div className="px-5 py-4">
            <Bar className="h-[132px] w-full rounded" />
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-lg border border-ink-12 bg-ink-12 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white px-5 py-4">
              <Bar className="h-3 w-32" />
              <Bar className="mt-3 h-8 w-14" />
              <Bar className="mt-2 h-2.5 w-28" />
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
