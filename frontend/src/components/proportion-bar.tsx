/**
 * A vessel's tasks as one bar: how much of its schedule is overdue, close, or
 * comfortable. Reads at a glance down a column of vessels, which a set of three
 * numbers per row does not.
 */
export function ProportionBar({
  due,
  soon,
  ok,
}: {
  due: number;
  soon: number;
  ok: number;
}) {
  const total = due + soon + ok;

  if (total === 0) {
    return <div className="h-1.5 w-full rounded-full bg-ink-12" aria-hidden />;
  }

  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-ink-12"
      role="img"
      aria-label={`${due} due, ${soon} due soon, ${ok} on track`}
    >
      {due > 0 ? <span className="bg-danger" style={{ width: pct(due) }} /> : null}
      {soon > 0 ? <span className="bg-caution" style={{ width: pct(soon) }} /> : null}
      {ok > 0 ? <span className="bg-safe" style={{ width: pct(ok) }} /> : null}
    </div>
  );
}
