import type { Distribution } from '@/lib/criticality';

/**
 * The spread across the register.
 *
 * The High band is normally expected to hold 10 to 20 per cent of assets. A
 * figure far outside that says the anchors need recalibrating rather than that
 * the fleet is unusual — which is why the target is drawn on the bar rather
 * than left for someone to remember.
 */
export function BandDistribution({ distribution }: { distribution: Distribution }) {
  const assessed = distribution.high + distribution.medium + distribution.low;
  const share = (n: number) => (assessed > 0 ? (n / assessed) * 100 : 0);

  const calibrated = distribution.high_percent >= 10 && distribution.high_percent <= 20;

  return (
    <section className="overflow-hidden rounded-lg border border-ink-12 bg-white">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-ink-12 px-5 py-3">
        <h2 className="text-[17px] font-semibold">Band distribution</h2>
        <p className="text-[13px] text-ink-45">
          {assessed} of {distribution.total} items assessed
        </p>
      </div>

      <div className="px-5 py-4">
        {assessed === 0 ? (
          <p className="text-sm text-ink-45">
            Nothing has been banded yet. Score an item to start.
          </p>
        ) : (
          <>
            <div className="relative">
              <div className="flex h-8 w-full overflow-hidden rounded bg-ink-06">
                {distribution.high > 0 ? (
                  <span className="bg-danger" style={{ width: `${share(distribution.high)}%` }} />
                ) : null}
                {distribution.medium > 0 ? (
                  <span className="bg-caution" style={{ width: `${share(distribution.medium)}%` }} />
                ) : null}
                {distribution.low > 0 ? (
                  <span className="bg-safe" style={{ width: `${share(distribution.low)}%` }} />
                ) : null}
              </div>

              {/* The 10–20% window the High band is expected to sit inside. */}
              <div
                className="pointer-events-none absolute -top-1 -bottom-1 border-x-2 border-dashed border-ink-45"
                style={{ left: '10%', width: '10%' }}
                aria-hidden
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-6">
              {[
                ['High', distribution.high, 'text-danger', 'bg-danger'],
                ['Medium', distribution.medium, 'text-caution', 'bg-caution'],
                ['Low', distribution.low, 'text-safe', 'bg-safe'],
                ['Not assessed', distribution.unassessed, 'text-ink-45', 'bg-ink-12'],
              ].map(([label, count, tone, dot]) => (
                <div key={String(label)} className="flex items-baseline gap-2">
                  <i className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-sm ${dot}`} aria-hidden />
                  <span className="text-[13px] text-ink-45">{label as string}</span>
                  <span className={`font-cond text-[17px] font-semibold ${tone}`}>
                    {count as number}
                  </span>
                </div>
              ))}
            </div>

            <p className={`mt-3 text-[13px] ${calibrated ? 'text-safe' : 'text-caution'}`}>
              {distribution.high_percent}% of assessed items are High.{' '}
              {calibrated
                ? 'Within the 10 to 20 per cent the scales are calibrated for.'
                : distribution.high_percent > 20
                  ? 'Above the expected 10 to 20 per cent — the anchors may be set too low.'
                  : 'Below the expected 10 to 20 per cent — the anchors may be set too high.'}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
