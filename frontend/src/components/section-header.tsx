import type { ReactNode } from 'react';

type Tone = 'shoal' | 'caution' | 'danger' | 'safe' | 'land';

/**
 * The title takes its section's tone, so the icon, the disc and the heading
 * read as one mark rather than three things that happen to be adjacent.
 *
 * Deep teal rather than the shoal used for fills: #4FA8B4 on white is about
 * 2.6:1, which is fine behind an icon and not fine for words.
 */
const look: Record<Tone, { disc: string; title: string }> = {
  shoal: { disc: 'bg-shoal-soft text-shoal-deep', title: 'text-shoal-ink' },
  caution: { disc: 'bg-caution-soft text-caution', title: 'text-caution' },
  danger: { disc: 'bg-danger-soft text-danger', title: 'text-danger' },
  safe: { disc: 'bg-safe-soft text-safe', title: 'text-safe' },
  land: { disc: 'bg-land text-[#4A3E1E]', title: 'text-[#4A3E1E]' },
};

/**
 * A section heading with enough presence to be found while scrolling.
 *
 * Six identical bordered panels with small black titles give the eye no rhythm —
 * every section reads as the same weight, so none of them reads as anything.
 */
export function SectionHeader({
  icon: Icon,
  tone = 'shoal',
  title,
  hint,
  action,
}: {
  icon: (props: { className?: string }) => ReactNode;
  tone?: Tone;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  const style = look[tone];

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-ink-12 px-5 py-3.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.disc}`}
        aria-hidden
      >
        <Icon className="h-[17px] w-[17px]" />
      </span>

      <div className="min-w-0">
        <h2 className={`font-cond text-[19px] leading-tight font-semibold ${style.title}`}>
          {title}
        </h2>
        {hint ? <p className="text-[12.5px] leading-snug text-ink-45">{hint}</p> : null}
      </div>

      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}
