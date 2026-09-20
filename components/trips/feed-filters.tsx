import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface FeedFiltersProps {
  category?: string;
  verified: boolean;
  lat?: string | null;
  lng?: string | null;
  maxPrice?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Plain GET form, no client JS — matches the rest of the feed's filtering
// (category/verified/near-me are all plain links), just with free-text
// inputs instead of a fixed set of links. Hidden inputs carry the filters
// that already have their own dedicated controls (category pills,
// Verified tab, Near me) forward so submitting this form doesn't reset
// them.
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
      className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      {category && <input type="hidden" name="category" value={category} />}
      {verified && <input type="hidden" name="verified" value="1" />}
      {lat && <input type="hidden" name="lat" value={lat} />}
      {lng && <input type="hidden" name="lng" value={lng} />}

      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {t('filterMaxPrice')}
        <input
          type="number"
          name="maxPrice"
          min={0}
          step={1000}
          defaultValue={maxPrice}
          placeholder="₡"
          className="h-9 w-28 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-forest-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {t('filterDateFrom')}
        <input
          type="date"
          name="dateFrom"
          defaultValue={dateFrom}
          className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-forest-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {t('filterDateTo')}
        <input
          type="date"
          name="dateTo"
          defaultValue={dateTo}
          className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-forest-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      <button
        type="submit"
        className="h-9 rounded-full bg-forest-600 px-4 text-sm font-medium text-white transition-colors hover:bg-forest-700"
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
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          {t('filterClear')}
        </Link>
      )}
    </form>
  );
}
