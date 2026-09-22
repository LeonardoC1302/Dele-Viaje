import { getTranslations } from 'next-intl/server';
import { MagnifyingGlass, X } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { controlClasses } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/**
 * Text search for the feed.
 *
 * A plain GET form with no client JS, matching every other filter on
 * this page. It was the one discovery affordance missing entirely — you
 * could filter by category, price, date and distance, but not look for
 * a trip by name.
 *
 * The hidden inputs carry the other active filters forward, so
 * searching inside "verified tours under ₡50.000" narrows that set
 * instead of silently resetting it.
 */
export async function FeedSearch({
  q,
  category,
  verified,
  lat,
  lng,
  maxPrice,
  dateFrom,
  dateTo,
}: {
  q?: string;
  category?: string;
  verified: boolean;
  lat?: string | null;
  lng?: string | null;
  maxPrice?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const t = await getTranslations('feed');

  const carried = {
    ...(category ? { category } : {}),
    ...(verified ? { verified: '1' } : {}),
    ...(lat ? { lat } : {}),
    ...(lng ? { lng } : {}),
    ...(maxPrice ? { maxPrice } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  return (
    <form method="get" action="/feed" className="mb-5 flex items-center gap-2">
      {Object.entries(carried).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <MagnifyingGlass
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sand-400"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          className={cn(controlClasses, 'h-10 pl-9')}
        />
      </div>

      <button
        type="submit"
        className="h-10 shrink-0 rounded-full border border-sand-300 px-4 font-display text-sm font-semibold text-sand-800 transition-colors hover:border-sand-400 hover:bg-sand-100 dark:border-sand-600 dark:text-sand-100 dark:hover:bg-sand-800"
      >
        {t('searchSubmit')}
      </button>

      {q && (
        <Link
          href={{ pathname: '/feed', query: carried }}
          className="micro-label inline-flex h-10 shrink-0 items-center gap-1 px-2 transition-colors hover:text-sand-800 dark:hover:text-sand-200"
        >
          <X size={12} weight="bold" />
          {t('searchClear')}
        </Link>
      )}
    </form>
  );
}
