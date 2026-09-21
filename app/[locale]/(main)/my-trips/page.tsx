import { getTranslations } from 'next-intl/server';
import { UsersThree, Compass } from '@phosphor-icons/react/dist/ssr';
import { Link, redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TripCard, type TripCardData } from '@/components/trips/trip-card';
import { CaseHeader, PageBody } from '@/components/cordillera/folder';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    <main>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-7 sm:py-10">
        <CaseHeader title={t('title')} description={t('subtitle')} />

        {ownedCards.length === 0 && joinedCards.length === 0 ? (
          <div className="mt-16 flex flex-col items-center rounded-md border border-dashed border-sand-300 py-16 text-center dark:border-sand-700">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-dawn-50 dark:bg-dawn-900/40">
              <Compass size={28} weight="regular" className="text-dawn-600 dark:text-dawn-300" />
            </div>
            <p className="mt-4 text-lg font-semibold text-sand-900 dark:text-sand-100">
              {t('emptyTitle')}
            </p>
            <p className="mt-1 max-w-sm text-sm text-sand-500 dark:text-sand-400">{t('emptyBody')}</p>
            <Link href="/feed" className={cn(buttonVariants({ size: 'sm' }), 'font-display mt-5')}>
              {t('emptyCta')}
            </Link>
          </div>
        ) : (
          <>
            {ownedCards.length > 0 && (
              <section className="mt-8">
                <h2 className="flex items-center gap-2 text-sm font-display font-bold uppercase tracking-wide text-dawn-700 dark:text-dawn-300">
                  <UsersThree size={16} weight="bold" />
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
                <h2 className="flex items-center gap-2 text-sm font-display font-bold uppercase tracking-wide text-dawn-700 dark:text-dawn-300">
                  <Compass size={16} weight="bold" />
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
