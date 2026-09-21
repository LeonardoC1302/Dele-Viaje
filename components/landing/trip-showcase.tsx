import { getTranslations } from 'next-intl/server';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TripCard, type TripCardData } from '@/components/trips/trip-card';

/**
 * Real upcoming trips, read live from the database.
 *
 * This section replaced a UI-only email-capture "waitlist" that was
 * never wired to a backend and whose pre-launch copy had gone stale.
 * Proof beats claims: three live trips a visitor can click into say
 * more than any amount of marketing copy, and they're rendered with the
 * exact `TripCard` the feed uses, so nothing here is a mockup of the
 * product.
 *
 * Renders nothing at all when there are no published public trips —
 * an empty "Happening soon" shelf would actively undercut the claim it
 * exists to make.
 */
export async function TripShowcase() {
  const t = await getTranslations('tripShowcase');
  const supabase = await createClient();

  const { data: trips } = await supabase
    .from('trips')
    .select(
      'id, title, category, location_name, start_at, capacity, confirmed_count, type, price_crc'
    )
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(3);

  if (!trips || trips.length === 0) return null;

  const cards: TripCardData[] = trips.map((trip) => ({
    id: trip.id,
    title: trip.title,
    category: trip.category,
    locationName: trip.location_name,
    startAt: trip.start_at,
    capacity: trip.capacity,
    confirmedCount: trip.confirmed_count,
    type: trip.type,
    priceCrc: trip.price_crc,
  }));

  return (
    <section className="border-t border-sand-200 bg-[color:var(--sunken)] py-20 dark:border-sand-800 sm:py-24">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="text-display-sm font-extrabold text-sand-900 dark:text-sand-50">
              {t('title')}
            </h2>
            <p className="mt-3 max-w-[56ch] leading-relaxed text-sand-600 dark:text-sand-400">
              {t('subtitle')}
            </p>
          </div>

          <Link href="/feed" className="link inline-flex items-center gap-1.5 font-display text-sm font-semibold">
            {t('viewAll')}
            <ArrowRight size={15} weight="bold" />
          </Link>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      </div>
    </section>
  );
}
