'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * A thin bar across the top while a navigation is in flight.
 *
 * Server components mean the browser sits on the old page until the new one is
 * ready, with nothing to say a click registered. The bar answers that in the
 * first hundred milliseconds; the skeleton takes over once the route swaps.
 */
export function NavProgress() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [visible, setVisible] = useState(false);

  // A route change has completed: retire the bar.
  useEffect(() => {
    setVisible(false);
  }, [pathname, params]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement)?.closest?.('a');

      if (!anchor) return;

      const href = anchor.getAttribute('href');

      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('http') ||
        anchor.getAttribute('target') === '_blank' ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return;
      }

      const destination = href.split('?')[0];

      if (destination !== pathname) setVisible(true);
    };

    document.addEventListener('click', onClick);

    return () => document.removeEventListener('click', onClick);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden"
      role="status"
      aria-label="Loading"
    >
      <span className="nav-progress-bar block h-full w-full bg-danger" />
    </div>
  );
}
