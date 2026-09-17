import { getTranslations } from 'next-intl/server';
import { Compass } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { CATEGORY_KEYS } from '@/lib/constants/categories';
import { TripCard, type TripCardData } from '@/components/trips/trip-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const t = await getTranslations('feed');
  const tCategories = await getTranslations('categories');
  const supabase = await createClient();

  let query = supabase
    .from('trips')
    .select(
      'id, title, category, location_name, start_at, capacity, confirmed_count'
    )
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true });

  const activeCategory = CATEGORY_KEYS.includes(category as never)
    ? category
    : undefined;

  if (activeCategory) {
    query = query.eq('category', activeCategory);
  }

  const { data: trips } = await query;

  const tripCards: TripCardData[] = (trips ?? []).map((trip) => ({
    id: trip.id,
    title: trip.title,
    category: trip.category,
    locationName: trip.location_name,
    startAt: trip.start_at,
    capacity: trip.capacity,
    confirmedCount: trip.confirmed_count,
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
        </div>

        {tripCards.length === 0 ? (
          <div className="mt-16 flex flex-col items-center rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
            <Compass
              size={40}
              weight="regular"
              strokeWidth={1.5}
              className="text-neutral-400 dark:text-neutral-600"
            />
            <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {activeCategory ? t('noResultsTitle') : t('emptyTitle')}
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {activeCategory ? t('noResultsBody') : t('emptyBody')}
            </p>
            <Link
              href={activeCategory ? '/feed' : '/trips/new'}
              className={cn(buttonVariants({ size: 'md', variant: 'primary' }), 'mt-6')}
            >
              {activeCategory ? t('clearFilter') : t('emptyCta')}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tripCards.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
