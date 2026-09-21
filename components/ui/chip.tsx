import { cn } from '@/lib/utils';

/**
 * Filter chips. One definition shared by the category links, the
 * Verified toggle and the Near-me button, because those three sit in
 * the same row and drifted apart in the previous UI — each had its own
 * hand-written pill classes and its own idea of the active state.
 *
 * `tone` exists only so the Verified filter can read as a credential
 * rather than as one more category: it is the single dawn-colored chip
 * in the row when active.
 */
export function chipClasses({
  active,
  tone = 'default',
}: {
  active?: boolean;
  tone?: 'default' | 'accent';
} = {}) {
  return cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 font-display text-sm font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--page)]',
    'disabled:cursor-not-allowed disabled:opacity-60',
    active && tone === 'accent' && 'border-dawn-500 bg-dawn-500 text-sand-950',
    active && tone === 'default' && 'border-forest-600 bg-forest-600 text-white',
    !active &&
      'border-sand-300 bg-[color:var(--raised)] text-sand-700 hover:border-sand-400 hover:bg-sand-100 dark:border-sand-700 dark:text-sand-300 dark:hover:border-sand-600 dark:hover:bg-sand-800'
  );
}
