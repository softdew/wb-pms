/** An empty screen is an invitation to act, not a shrug. */
export function Empty({ title, action }: { title: string; action?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-cond text-lg font-semibold">{title}</p>
      {action ? <p className="mt-1 text-sm text-ink-45">{action}</p> : null}
    </div>
  );
}
