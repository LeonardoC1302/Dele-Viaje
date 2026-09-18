import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTripSchema } from '@/lib/validators/trip';

// See docs/api.md §3. Organizer-only edit — RLS ("trips: owner updates
// own") is the real enforcement; the owner_id check here just gives a
// clean 403 instead of a generic RLS-violation error.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: 'ERR_UNAUTHENTICATED', message: 'Sign in required.' } },
      { status: 401 }
    );
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id, owner_id')
    .eq('id', id)
    .single();

  if (!trip) {
    return NextResponse.json(
      { error: { code: 'ERR_NOT_FOUND', message: 'Trip not found.' } },
      { status: 404 }
    );
  }

  if (trip.owner_id !== user.id) {
    return NextResponse.json(
      { error: { code: 'ERR_FORBIDDEN', message: 'Only the organizer can edit this trip.' } },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const validated = createTripSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      {
        error: {
          code: 'ERR_VALIDATION',
          message: 'Invalid trip data.',
          issues: validated.error.flatten(),
        },
      },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from('trips')
    .update({
      title: validated.data.title,
      description: validated.data.description,
      category: validated.data.category,
      location_name: validated.data.locationName,
      lat: validated.data.lat ?? null,
      lng: validated.data.lng ?? null,
      start_at: validated.data.startAt,
      end_at: validated.data.endAt,
      capacity: validated.data.capacity ?? null,
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_UPDATE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  // Simplest correct way to reconcile an ordered list on edit: replace it
  // wholesale rather than diffing. Trip waypoint counts are small (max 20)
  // so this is cheap, and it's organizer-only so there's no concurrent-
  // editor race to worry about.
  await supabase.from('trip_waypoints').delete().eq('trip_id', id);
  if (validated.data.waypoints && validated.data.waypoints.length > 0) {
    const { error: waypointsError } = await supabase.from('trip_waypoints').insert(
      validated.data.waypoints.map((wp, index) => ({
        trip_id: id,
        label: wp.label,
        lat: wp.lat,
        lng: wp.lng,
        kind: wp.kind,
        sort: index,
      }))
    );
    if (waypointsError) {
      console.error('Failed to save trip waypoints:', waypointsError);
    }
  }

  return NextResponse.json({ id });
}
