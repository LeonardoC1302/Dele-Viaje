import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { CalendarBlank, MapPin, UsersThree, ChatCircleText, PencilSimple } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { JoinTripButton, type AttendeeStatus } from '@/components/trips/join-trip-button';
import { AttendeeList, type AttendeeData } from '@/components/trips/attendee-list';
import { ReportButton } from '@/components/reports/report-button';
import { TripRouteMap } from '@/components/trips/trip-route-map';

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations('trips');
  const tCategories = await getTranslations('categories');
  const tFeed = await getTranslations('feed');
  const locale = await getLocale();

  const { data: trip } = await supabase
    .from('trips')
    .select(
      'id, title, description, category, location_name, lat, lng, start_at, end_at, capacity, confirmed_count, owner_id'
    )
    .eq('id', id)
    .single();

  if (!trip) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerQuery = supabase.rpc('profiles_public').eq('id', trip.owner_id).single();
  const waypointsQuery = supabase
    .from('trip_waypoints')
    .select('label, lat, lng, kind')
    .eq('trip_id', trip.id)
    .order('sort', { ascending: true });
  const attendeeQuery = user
    ? supabase
        .from('attendees')
        .select('status')
        .eq('trip_id', trip.id)
        .eq('profile_id', user.id)
        .maybeSingle()
    : Promise.resolve({ data: null });
  const confirmedRowsQuery = supabase
    .from('attendees')
    .select('profile_id')
    .eq('trip_id', trip.id)
    .eq('status', 'confirmed')
    .order('joined_at', { ascending: true });

  const [ownerResult, attendeeResult, confirmedRowsResult, waypointsResult] = await Promise.all([
    ownerQuery,
    attendeeQuery,
    confirmedRowsQuery,
    waypointsQuery,
  ]);
  const owner = ownerResult.data as { display_name: string | null } | null;
  const waypoints = waypointsResult.data ?? [];
  const myAttendance = attendeeResult.data as { status: string } | null;
  const confirmedIds = (confirmedRowsResult.data ?? []).map(
    (row) => row.profile_id as string
  );

  const { data: attendeeProfilesData } =
    confirmedIds.length > 0
      ? await supabase.rpc('profiles_public').in('id', confirmedIds)
      : { data: [] };
  const attendeeProfiles = (attendeeProfilesData ?? []) as {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  }[];
  const profileById = new Map(attendeeProfiles.map((p) => [p.id, p]));
  const attendees: AttendeeData[] = confirmedIds.map((profileId) => {
    const profile = profileById.get(profileId);
    return {
      id: profileId,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    };
  });

  const attendeeStatus: AttendeeStatus =
    myAttendance?.status === 'confirmed' || myAttendance?.status === 'waitlisted'
      ? myAttendance.status
      : null;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });

  const spotsLeft =
    trip.capacity != null ? trip.capacity - trip.confirmed_count : null;
  const isFull = spotsLeft != null && spotsLeft <= 0;
  const hasStarted = new Date(trip.start_at) <= new Date();
  const isOwner = user?.id === trip.owner_id;
  const canOpenChat = isOwner || attendeeStatus !== null;

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <Link
          href="/feed"
          className="text-sm font-medium text-forest-600 hover:underline dark:text-forest-400"
        >
          &larr; {t('detailBack')}
        </Link>

        <div className="relative mt-6 rounded-xl border border-neutral-200 bg-white p-8 pb-16 dark:border-neutral-800 dark:bg-neutral-900">
          <Badge variant="default">{tCategories(trip.category)}</Badge>

          <h1 className="mt-4 text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50">
            {trip.title}
          </h1>

          <div className="mt-2 flex items-center justify-between gap-4">
            {owner?.display_name && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t.rich('detailBy', {
                  name: owner.display_name,
                  link: (chunks) => (
                    <Link
                      href={`/users/${trip.owner_id}`}
                      className="font-medium text-neutral-700 hover:underline dark:text-neutral-300"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            )}
            {isOwner ? (
              <Link
                href={`/trips/${trip.id}/edit`}
                className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-forest-600 dark:text-neutral-400 dark:hover:text-forest-400"
              >
                <PencilSimple size={16} weight="regular" strokeWidth={1.5} />
                {t('editTrip')}
              </Link>
            ) : (
              user && <ReportButton targetType="trip" targetId={trip.id} />
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-y border-neutral-200 py-6 dark:border-neutral-800">
            <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <CalendarBlank size={18} weight="regular" strokeWidth={1.5} />
              {dateFormatter.format(new Date(trip.start_at))}
            </p>
            <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <MapPin size={18} weight="regular" strokeWidth={1.5} />
              {trip.location_name}
            </p>
            <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <UsersThree size={18} weight="regular" strokeWidth={1.5} />
              {trip.capacity == null
                ? tFeed('openCapacity')
                : isFull
                  ? tFeed('full')
                  : tFeed('spotsLeft', { count: spotsLeft })}
            </p>
          </div>

          <p className="mt-6 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
            {trip.description}
          </p>

          {trip.lat != null && trip.lng != null && (
            <div className="mt-6">
              <TripRouteMap
                meetingPoint={{ label: trip.location_name, lat: trip.lat, lng: trip.lng }}
                waypoints={waypoints}
              />
            </div>
          )}

          <div className="mt-8 flex flex-col items-start gap-3">
            <JoinTripButton
              tripId={trip.id}
              initialStatus={attendeeStatus}
              isAuthenticated={!!user}
              isOwner={isOwner}
              isFull={isFull}
              hasStarted={hasStarted}
            />
            {canOpenChat && (
              <Link
                href={`/trips/${trip.id}/chat`}
                className={buttonVariants({ size: 'md', variant: 'outline' })}
              >
                <ChatCircleText size={18} weight="regular" strokeWidth={1.5} />
                {t('openChat')}
              </Link>
            )}
          </div>

          <AttendeeList attendees={attendees} currentUserId={user?.id} />
        </div>
      </div>
    </main>
  );
}
