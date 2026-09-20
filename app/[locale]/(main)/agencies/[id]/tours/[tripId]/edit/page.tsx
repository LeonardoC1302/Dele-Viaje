import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TourForm, type TourFormInitialValues } from '@/components/agencies/tour-form';

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

  const [waypointsResult, customFieldsResult, linksResult, exclusiveContentResult] = await Promise.all([
    supabase
      .from('trip_waypoints')
      .select('label, lat, lng, kind')
      .eq('trip_id', tripId)
      .order('sort', { ascending: true }),
    supabase
      .from('trip_custom_fields')
      .select('label, value')
      .eq('trip_id', tripId)
      .order('sort', { ascending: true }),
    supabase
      .from('trip_links')
      .select('url, label')
      .eq('trip_id', tripId)
      .order('sort', { ascending: true }),
    supabase.from('tour_exclusive_content').select('content').eq('trip_id', tripId).maybeSingle(),
  ]);

  const initialValues: TourFormInitialValues = {
    title: trip.title,
    description: trip.description,
    category: trip.category,
    locationName: trip.location_name,
    lat: trip.lat,
    lng: trip.lng,
    waypoints: (waypointsResult.data ?? []) as TourFormInitialValues['waypoints'],
    customFields: customFieldsResult.data ?? [],
    links: (linksResult.data ?? []).map((l) => ({ url: l.url, label: l.label ?? '' })),
    startAt: trip.start_at,
    endAt: trip.end_at,
    capacity: trip.capacity ?? 1,
    minParticipants: trip.min_participants,
    priceCrc: trip.price_crc ?? 0,
    exclusiveContent: exclusiveContentResult.data?.content ?? '',
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 py-16 dark:bg-neutral-950">
      <TourForm agencyId={id} mode="edit" tripId={tripId} initialValues={initialValues} />
    </main>
  );
}
