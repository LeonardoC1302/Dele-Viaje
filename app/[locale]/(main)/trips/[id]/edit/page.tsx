import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TripForm, type TripFormInitialValues } from '@/components/trips/trip-form';
import { mapAdvisoryTypes } from '@/lib/constants/advisories';

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
  }

  const { data: trip } = await supabase
    .from('trips')
    .select(
      'id, title, description, category, location_name, lat, lng, start_at, end_at, capacity, owner_id'
    )
    .eq('id', id)
    .single();

  if (!trip) {
    notFound();
  }

  if (trip.owner_id !== user.id) {
    redirect({ href: `/trips/${id}`, locale });
  }

  const [waypointsResult, customFieldsResult, linksResult, advisoryResult, advisoryTypeResult] =
    await Promise.all([
    supabase
      .from('trip_waypoints')
      .select('label, lat, lng, kind')
      .eq('trip_id', id)
      .order('sort', { ascending: true }),
    supabase
      .from('trip_custom_fields')
      .select('label, value')
      .eq('trip_id', id)
      .order('sort', { ascending: true }),
    supabase
      .from('trip_links')
      .select('url, label')
      .eq('trip_id', id)
      .order('sort', { ascending: true }),
    supabase.from('trip_advisories').select('code, note').eq('trip_id', id),
    supabase.from('trip_advisory_types').select('code, label_es, label_en, icon, severity'),
  ]);

  const initialValues: TripFormInitialValues = {
    title: trip.title,
    description: trip.description,
    category: trip.category,
    locationName: trip.location_name,
    lat: trip.lat,
    lng: trip.lng,
    waypoints: (waypointsResult.data ?? []) as TripFormInitialValues['waypoints'],
    customFields: customFieldsResult.data ?? [],
    links: (linksResult.data ?? []).map((l) => ({ url: l.url, label: l.label ?? '' })),
    advisories: (advisoryResult.data ?? []).map((a) => ({ code: a.code, note: a.note ?? '' })),
    startAt: trip.start_at,
    endAt: trip.end_at,
    capacity: trip.capacity,
  };

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-7 sm:py-10">
      <TripForm
        mode="edit"
        tripId={trip.id}
        initialValues={initialValues}
        advisoryTypes={mapAdvisoryTypes(advisoryTypeResult.data ?? [])}
      />
    </main>
  );
}
