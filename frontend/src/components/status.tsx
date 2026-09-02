import { dueStatusBar, dueStatusColour, dueStatusLabel } from '@/lib/format';
import type { CriticalityBand, DueStatus } from '@/types/api';

/**
 * A 3px bar and a word, not a solid pill.
 *
 * A schedule with fourteen overdue rows should read as serious without becoming
 * a wall of colour; a page of solid red blocks stops carrying information.
 */
export function DueBadge({ status }: { status: DueStatus | null }) {
  if (!status) return <span className="text-ink-45">—</span>;

  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${dueStatusColour[status]}`}>
      <i className={`block h-[15px] w-[3px] rounded-sm ${dueStatusBar[status]}`} aria-hidden />
      {dueStatusLabel[status]}
    </span>
  );
}

const bandStyle: Record<CriticalityBand, string> = {
  high: 'border-danger/30 bg-danger-soft text-danger',
  medium: 'border-caution/30 bg-caution-soft text-caution',
  low: 'border-safe/30 bg-safe-soft text-safe',
};

export function BandBadge({ band }: { band: CriticalityBand | null }) {
  if (!band) {
    return <span className="text-sm text-ink-45">Not assessed</span>;
  }

  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[12.5px] font-medium capitalize ${bandStyle[band]}`}
    >
      {band}
    </span>
  );
}

export function VesselStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'text-safe'
      : status === 'disposed'
        ? 'text-ink-45'
        : 'text-caution';

  return <span className={`text-sm font-medium capitalize ${tone}`}>{status.replace(/_/g, ' ')}</span>;
}
