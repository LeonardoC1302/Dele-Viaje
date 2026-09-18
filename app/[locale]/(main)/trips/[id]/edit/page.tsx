import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TripForm, type TripFormInitialValues } from '@/components/trips/trip-form';

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

  const { data: waypointRows } = await supabase
    .from('trip_waypoints')
    .select('label, lat, lng, kind')
    .eq('trip_id', id)
    .order('sort', { ascending: true });

  const initialValues: TripFormInitialValues = {
    title: trip.title,
    description: trip.description,
    category: trip.category,
    locationName: trip.location_name,
    lat: trip.lat,
    lng: trip.lng,
    waypoints: (waypointRows ?? []) as TripFormInitialValues['waypoints'],
    startAt: trip.start_at,
    endAt: trip.end_at,
    capacity: trip.capacity,
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 py-16 dark:bg-neutral-950">
      <TripForm mode="edit" tripId={trip.id} initialValues={initialValues} />
    </main>
  );
}
