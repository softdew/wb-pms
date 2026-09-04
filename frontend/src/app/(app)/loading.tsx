import { PageSkeleton } from '@/components/skeleton';

/**
 * Shown on every navigation inside the app while the server component fetches.
 *
 * It renders inside the layout, so the rail stays put and only the content
 * area changes — which is what makes navigation feel immediate even when the
 * data behind it is not.
 */
export default function Loading() {
  return <PageSkeleton />;
}
