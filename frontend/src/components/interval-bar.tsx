/**
 * How far through its interval a task has run.
 *
 * Overdue fills completely and turns magenta; anything else shows the portion
 * consumed. A number alone does not say whether 400 hours remaining is
 * comfortable or nearly up — that depends on the interval, and this shows both
 * at once.
 */
export function IntervalBar({
  consumed,
  interval,
  overdue,
}: {
  consumed: number | null;
  interval: number | null;
  overdue: boolean;
}) {
  if (overdue) {
    return (
      <div className="mt-1.5 h-1 w-[74px] overflow-hidden rounded-full bg-ink-12">
        <span className="block h-full w-full bg-danger" />
      </div>
    );
  }

  if (consumed === null || !interval || interval <= 0) {
    return null;
  }

  const share = Math.max(0, Math.min(1, consumed / interval));

  return (
    <div className="mt-1.5 h-1 w-[74px] overflow-hidden rounded-full bg-ink-12">
      <span
        className={`block h-full ${share > 0.75 ? 'bg-caution' : 'bg-safe'}`}
        style={{ width: `${share * 100}%` }}
      />
    </div>
  );
}
