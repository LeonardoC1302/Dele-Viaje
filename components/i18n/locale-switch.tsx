'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

/**
 * Locale switch.
 *
 * Both locales are always shown rather than hidden behind a dropdown —
 * with exactly two, a menu costs a click to reveal what a pair of
 * labels says outright, and bilingual-by-default is a product
 * commitment worth stating on the surface.
 *
 * `usePathname` from `@/i18n/navigation` returns the path *without* the
 * locale segment, and `<Link locale=…>` re-adds the target one, so the
 * switch preserves whatever route you're on. Because `routing` declares
 * no `pathnames` mapping, that pathname already contains resolved
 * dynamic segments (`/trips/abc-123`, not `/trips/[id]`), so there is
 * nothing to interpolate back in.
 */
export function LocaleSwitch({ tone = 'light' }: { tone?: 'light' | 'onDark' }) {
  const active = useLocale();
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden rounded-full border',
        tone === 'onDark' ? 'border-forest-500/50' : 'border-sand-300 dark:border-sand-700'
      )}
    >
      {routing.locales.map((locale) => {
        const isActive = locale === active;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'px-2.5 py-1 font-display text-xs font-bold uppercase tracking-[0.1em] transition-colors',
              isActive && 'bg-forest-600 text-white',
              !isActive && tone === 'onDark' && 'text-forest-100/60 hover:text-white',
              !isActive &&
                tone === 'light' &&
                'text-sand-500 hover:bg-sand-100 hover:text-sand-800 dark:hover:bg-sand-800 dark:hover:text-sand-100'
            )}
          >
            {locale}
          </Link>
        );
      })}
    </div>
  );
}
