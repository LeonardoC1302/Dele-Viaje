import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { BackLink } from '@/components/ui/back-link';
import { TourForm, type TourFormInitialValues } from '@/components/agencies/tour-form';
import { mapAdvisoryTypes } from '@/lib/constants/advisories';

export default async function EditTourPage({
  params,
}: {
  params: Promise<{ id: string; tripId: string; locale: string }>;
}) {
  const { id, tripId, locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
  }

  const { data: membership } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    redirect({ href: `/agencies/${id}`, locale });
  }

  const { data: trip } = await supabase
    .from('trips')
    .select(
      'id, title, description, category, location_name, lat, lng, start_at, end_at, capacity, min_participants, price_crc, agency_id'
    )
    .eq('id', tripId)
    .eq('agency_id', id)
    .single();

  if (!trip) {
    notFound();
  }

  const [
    waypointsResult,
    customFieldsResult,
    linksResult,
    exclusiveContentResult,
    advisoryResult,
    advisoryTypeResult,
    routesResult,
  ] = await Promise.all([
    supabase
      .from('trip_waypoints')
      .select('label, lat, lng, kind')
      .eq('trip_id', tripId)
      .order('sort', { ascending: true }),
    supabase
      .from('trip_custom_fields')
      .select('label, value, icon')
      .eq('trip_id', tripId)
      .order('sort', { ascending: true }),
    supabase
      .from('trip_links')
      .select('url, label')
      .eq('trip_id', tripId)
      .order('sort', { ascending: true }),
    supabase.from('tour_exclusive_content').select('content').eq('trip_id', tripId).maybeSingle(),
    supabase.from('trip_advisories').select('code, note').eq('trip_id', tripId),
    supabase.from('trip_advisory_types').select('code, label_es, label_en, icon, severity'),
    supabase
      .from('trip_routes')
      .select(
        'name, stop_sort, geometry, profile, distance_m, ascent_m, descent_m, min_ele_m, max_ele_m, point_count'
      )
      .eq('trip_id', tripId)
      .order('sort', { ascending: true }),
  ]);

  const initialValues: TourFormInitialValues = {
    title: trip.title,
    description: trip.description,
    category: trip.category,
    locationName: trip.location_name,
    lat: trip.lat,
    lng: trip.lng,
    waypoints: (waypointsResult.data ?? []) as TourFormInitialValues['waypoints'],
          advisories: (advisoryResult.data ?? []).map((a) => ({ code: a.code, note: a.note ?? '' })),
    customFields: customFieldsResult.data ?? [],
    // Re-submitted on save, since the PATCH replaces the route set
    // wholesale — same round-trip as the trip edit form.
    routes: (routesResult.data ?? []).map((r) => ({
      name: r.name,
      stopSort: r.stop_sort,
      coordinates: r.geometry as [number, number][],
      profile: r.profile as [number, number][] | null,
      distanceM: r.distance_m,
      ascentM: r.ascent_m,
      descentM: r.descent_m,
      minEleM: r.min_ele_m,
      maxEleM: r.max_ele_m,
      pointCount: r.point_count,
    })),
    links: (linksResult.data ?? []).map((l) => ({ url: l.url, label: l.label ?? '' })),
    startAt: trip.start_at,
    endAt: trip.end_at,
    capacity: trip.capacity ?? 1,
    minParticipants: trip.min_participants,
    priceCrc: trip.price_crc ?? 0,
    exclusiveContent: exclusiveContentResult.data?.content ?? '',
  };

  const t = await getTranslations('agencies');

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-7 sm:py-10">
      {/* Back to the tour itself, matching where this form's Cancel
          goes — a tour edit is reached from the tour, not the panel. */}
      <BackLink href={`/trips/${tripId}`}>{t('backToTour')}</BackLink>
      <TourForm agencyId={id} mode="edit" tripId={tripId} initialValues={initialValues} />
    </main>
  );
}
