'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A confirmation that leaves.
 *
 * Success needs acknowledging, not announcing: a filled panel reads as part of
 * the form and sits there until the page reloads, which makes a stale message
 * look like a live one. This is a quiet line that fades out after a few
 * seconds.
 *
 * Pass the action state itself as `on` — a new object arrives on every
 * successful submission, so a second identical save still shows.
 */
export function SavedNote({ on, children }: { on: unknown; children: React.ReactNode }) {
  const [phase, setPhase] = useState<'in' | 'out' | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;

      return;
    }

    if (!on) return;

    setPhase('in');

    const fade = setTimeout(() => setPhase('out'), 3200);
    const clear = setTimeout(() => setPhase(null), 3700);

    return () => {
      clearTimeout(fade);
      clearTimeout(clear);
    };
  }, [on]);

  if (phase === null) return null;

  return (
    <p
      role="status"
      className={`flex items-center gap-1.5 text-[13px] font-medium text-safe transition-opacity duration-500 ${
        phase === 'out' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 shrink-0"
        aria-hidden
      >
        <path d="M4 12.5 9.5 18 20 6.5" />
      </svg>
      {children}
    </p>
  );
}
