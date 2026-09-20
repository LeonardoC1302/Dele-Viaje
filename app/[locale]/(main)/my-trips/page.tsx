import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TripCard, type TripCardData } from '@/components/trips/trip-card';

export default async function MyTripsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('myTrips');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
  }

  const { data: ownedTrips } = await supabase
    .from('trips')
    .select('id, title, category, location_name, start_at, capacity, confirmed_count, visibility')
    .eq('owner_id', user.id)
    .order('start_at', { ascending: false });

  // Owning a trip and attending one are tracked separately (`trips.owner_id`
  // vs `attendees`), so "everything I'm part of" needs both queries — the
  // owner query above misses every trip where this user is just a member,
  // which is exactly the private-plan case that prompted this page to
  // exist in the first place (an invited member had literally nowhere to
  // find a plan they'd joined but didn't own). Two plain queries rather
  // than a PostgREST embedded-resource filter (`trips!inner(...)` +
  // `.neq('trips.owner_id', ...)`) — same two-step shape already used
  // elsewhere on this page's sibling (confirmed attendees -> profile
  // lookup on the trip detail page) rather than relying on embedded-filter
  // syntax.
  const { data: joinedAttendeeRows } = await supabase
    .from('attendees')
    .select('trip_id')
    .eq('profile_id', user.id)
    .eq('status', 'confirmed');
  const ownedIds = new Set((ownedTrips ?? []).map((t) => t.id));
  const joinedTripIds = [
    ...new Set((joinedAttendeeRows ?? []).map((r) => r.trip_id).filter((id) => !ownedIds.has(id))),
  ];

  const { data: joinedTrips } =
    joinedTripIds.length > 0
      ? await supabase
          .from('trips')
          .select('id, title, category, location_name, start_at, capacity, confirmed_count, visibility')
          .in('id', joinedTripIds)
      : { data: [] };

  const toCard = (trip: {
    id: string;
    title: string;
    category: string;
    location_name: string;
    start_at: string;
    capacity: number | null;
    confirmed_count: number;
    visibility: 'public' | 'private';
  }): TripCardData => ({
    id: trip.id,
    title: trip.title,
    category: trip.category,
    locationName: trip.location_name,
    startAt: trip.start_at,
    capacity: trip.capacity,
    confirmedCount: trip.confirmed_count,
    visibility: trip.visibility,
  });

  const ownedCards: TripCardData[] = (ownedTrips ?? []).map(toCard);
  const joinedCards: TripCardData[] = (joinedTrips ?? []).map(toCard);

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {t('title')}
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

        {ownedCards.length === 0 && joinedCards.length === 0 ? (
          <div className="mt-16 flex flex-col items-center rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {t('emptyTitle')}
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('emptyBody')}</p>
          </div>
        ) : (
          <>
            {ownedCards.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {t('organizingTitle')}
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {ownedCards.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}

            {joinedCards.length > 0 && (
              <section className="mt-10">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {t('joinedTitle')}
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {joinedCards.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
