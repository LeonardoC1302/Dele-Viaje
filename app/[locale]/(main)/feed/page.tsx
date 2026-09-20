import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { CATEGORY_KEYS } from '@/lib/constants/categories';
import { type TripCardData } from '@/components/trips/trip-card';
import { FeedView } from '@/components/trips/feed-view';
import { NearMeButton } from '@/components/trips/near-me-button';
import { FeedFilters } from '@/components/trips/feed-filters';
import { boundingBox, haversineKm } from '@/lib/geo';
import { cn } from '@/lib/utils';

const NEAR_ME_RADIUS_KM = 100;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    verified?: string;
    lat?: string;
    lng?: string;
    maxPrice?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const { category, verified, lat, lng, maxPrice, dateFrom, dateTo } = await searchParams;
  const t = await getTranslations('feed');
  const tCategories = await getTranslations('categories');
  const supabase = await createClient();

  const showVerifiedOnly = verified === '1';
  const userLat = lat ? Number(lat) : null;
  const userLng = lng ? Number(lng) : null;
  const nearMeActive = userLat != null && userLng != null && !Number.isNaN(userLat) && !Number.isNaN(userLng);

  // dateFrom only ever narrows the lower bound further into the future —
  // a past date picked here still can't surface trips that have already
  // happened, so the floor is always max(now, dateFrom).
  const now = new Date();
  const parsedDateFrom = dateFrom ? new Date(dateFrom) : null;
  const lowerBound =
    parsedDateFrom && !Number.isNaN(parsedDateFrom.getTime()) && parsedDateFrom > now
      ? parsedDateFrom
      : now;
  const parsedDateTo = dateTo ? new Date(dateTo) : null;
  const upperBound =
    parsedDateTo && !Number.isNaN(parsedDateTo.getTime())
      ? new Date(parsedDateTo.getTime() + 24 * 60 * 60 * 1000)
      : null;
  const parsedMaxPrice = maxPrice ? Number(maxPrice) : null;
  const validMaxPrice = parsedMaxPrice != null && !Number.isNaN(parsedMaxPrice) && parsedMaxPrice > 0 ? parsedMaxPrice : null;

  let query = supabase
    .from('trips')
    .select(
      'id, title, category, location_name, start_at, capacity, confirmed_count, lat, lng, type, price_crc'
    )
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('start_at', lowerBound.toISOString())
    .order('start_at', { ascending: true });

  if (upperBound) {
    query = query.lte('start_at', upperBound.toISOString());
  }

  // Social trips have no price at all (price_crc is null) — a price
  // filter should only ever exclude tours over budget, not hide every
  // social trip along with them.
  if (validMaxPrice != null) {
    query = query.or(`price_crc.lte.${validMaxPrice},price_crc.is.null`);
  }

  const activeCategory = CATEGORY_KEYS.includes(category as never)
    ? category
    : undefined;

  if (activeCategory) {
    query = query.eq('category', activeCategory);
  }

  // No PostGIS in this project — a bounding box is a cheap SQL
  // pre-filter (and rules out trips with no coordinates at all), then
  // haversineKm() below gives the exact distance for the real radius cut
  // and the sort order.
  if (nearMeActive) {
    const box = boundingBox(userLat, userLng, NEAR_ME_RADIUS_KM);
    query = query
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('lat', box.minLat)
      .lte('lat', box.maxLat)
      .gte('lng', box.minLng)
      .lte('lng', box.maxLng);
  }

  // "Verified" means tours from a currently-approved agency — checked at
  // read time, not just at the moment the tour was published, since an
  // agency can be suspended after publishing (nothing currently
  // un-publishes its existing tours when that happens). Two queries
  // rather than an embedded-resource filter (`agencies!inner(...)` +
  // `.eq('agencies.status', 'approved')`) — same reasoning as My Trips:
  // simpler and doesn't depend on PostgREST embedded-filter syntax this
  // codebase hasn't otherwise relied on.
  if (showVerifiedOnly) {
    const { data: approvedAgencies } = await supabase.from('agencies').select('id').eq('status', 'approved');
    const approvedIds = (approvedAgencies ?? []).map((a) => a.id);
    query = query.eq('type', 'tour').in('agency_id', approvedIds.length > 0 ? approvedIds : ['00000000-0000-0000-0000-000000000000']);
  }

  const { data: trips } = await query;

  let tripRows = trips ?? [];
  if (nearMeActive) {
    // The bounding box is a rectangle, not a circle — trim the corners
    // out with the real distance, then sort nearest-first (the default
    // start_at sort doesn't make sense once "near me" is the whole point
    // of this view).
    tripRows = tripRows
      .filter((trip) => trip.lat != null && trip.lng != null)
      .filter((trip) => haversineKm(userLat!, userLng!, trip.lat!, trip.lng!) <= NEAR_ME_RADIUS_KM)
      .sort((a, b) => haversineKm(userLat!, userLng!, a.lat!, a.lng!) - haversineKm(userLat!, userLng!, b.lat!, b.lng!));
  }

  const hasActiveFilters = !!(
    activeCategory ||
    showVerifiedOnly ||
    nearMeActive ||
    validMaxPrice != null ||
    (parsedDateFrom && !Number.isNaN(parsedDateFrom.getTime())) ||
    upperBound
  );

  const tripCards: TripCardData[] = tripRows.map((trip) => ({
    id: trip.id,
    title: trip.title,
    category: trip.category,
    locationName: trip.location_name,
    startAt: trip.start_at,
    capacity: trip.capacity,
    confirmedCount: trip.confirmed_count,
    lat: trip.lat,
    lng: trip.lng,
    type: trip.type,
    priceCrc: trip.price_crc,
  }));

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {t('title')}
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          {t('subtitle')}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/feed"
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              !activeCategory
                ? 'border-forest-600 bg-forest-600 text-white'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
            )}
          >
            {t('allCategories')}
          </Link>
          {CATEGORY_KEYS.map((key) => (
            <Link
              key={key}
              href={{ pathname: '/feed', query: { category: key } }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                activeCategory === key
                  ? 'border-forest-600 bg-forest-600 text-white'
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
              )}
            >
              {tCategories(key)}
            </Link>
          ))}
          <Link
            href={{
              pathname: '/feed',
              query: {
                ...(activeCategory ? { category: activeCategory } : {}),
                ...(showVerifiedOnly ? {} : { verified: '1' }),
              },
            }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              showVerifiedOnly
                ? 'border-forest-600 bg-forest-600 text-white'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
            )}
          >
            {t('verifiedTab')}
          </Link>
          <NearMeButton active={nearMeActive} category={activeCategory} />
        </div>

        <FeedFilters
          category={activeCategory}
          verified={showVerifiedOnly}
          lat={lat}
          lng={lng}
          maxPrice={maxPrice}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />

        <FeedView
          trips={tripCards}
          emptyTitle={hasActiveFilters ? t('noResultsTitle') : t('emptyTitle')}
          emptyBody={hasActiveFilters ? t('noResultsBody') : t('emptyBody')}
          emptyCtaHref={hasActiveFilters ? '/feed' : '/trips/new'}
          emptyCtaLabel={hasActiveFilters ? t('clearFilter') : t('emptyCta')}
        />
      </div>
    </main>
  );
}
