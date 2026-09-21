import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { controlClasses } from '@/components/ui/field';
import { cn } from '@/lib/utils';

interface FeedFiltersProps {
  category?: string;
  verified: boolean;
  lat?: string | null;
  lng?: string | null;
  maxPrice?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Plain GET form, no client JS — matching the rest of the feed's
 * filtering (category / verified / near-me are all plain links), just
 * with free-text inputs instead of a fixed set of links. The hidden
 * inputs carry the filters that have their own dedicated controls
 * forward, so submitting this form doesn't silently reset them.
 */
export async function FeedFilters({
  category,
  verified,
  lat,
  lng,
  maxPrice,
  dateFrom,
  dateTo,
}: FeedFiltersProps) {
  const t = await getTranslations('feed');
  const hasFilters = !!(maxPrice || dateFrom || dateTo);

  return (
    <form
      method="get"
      action="/feed"
      className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3 rounded-md border border-sand-200 bg-[color:var(--raised)] p-4 dark:border-sand-800"
    >
      {category && <input type="hidden" name="category" value={category} />}
      {verified && <input type="hidden" name="verified" value="1" />}
      {lat && <input type="hidden" name="lat" value={lat} />}
      {lng && <input type="hidden" name="lng" value={lng} />}

      <label className="flex flex-col gap-1.5">
        <span className="micro-label">{t('filterMaxPrice')}</span>
        <input
          type="number"
          name="maxPrice"
          min={0}
          step={1000}
          defaultValue={maxPrice}
          placeholder="₡"
          className={cn(controlClasses, 'tnum h-9 w-32')}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="micro-label">{t('filterDateFrom')}</span>
        <input
          type="date"
          name="dateFrom"
          defaultValue={dateFrom}
          className={cn(controlClasses, 'tnum h-9 w-auto')}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="micro-label">{t('filterDateTo')}</span>
        <input
          type="date"
          name="dateTo"
          defaultValue={dateTo}
          className={cn(controlClasses, 'tnum h-9 w-auto')}
        />
      </label>

      <button
        type="submit"
        className="h-9 rounded-full border border-sand-300 px-5 font-display text-sm font-semibold text-sand-800 transition-colors hover:border-sand-400 hover:bg-sand-100 dark:border-sand-600 dark:text-sand-100 dark:hover:bg-sand-800"
      >
        {t('filterApply')}
      </button>

      {hasFilters && (
        <Link
          href={{
            pathname: '/feed',
            query: {
              ...(category ? { category } : {}),
              ...(verified ? { verified: '1' } : {}),
              ...(lat ? { lat } : {}),
              ...(lng ? { lng } : {}),
            },
          }}
          className="link h-9 self-end pb-2 text-sm"
        >
          {t('filterClear')}
        </Link>
      )}
    </form>
  );
}
