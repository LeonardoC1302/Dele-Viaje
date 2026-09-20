import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTripSchema } from '@/lib/validators/trip';
import { geocodeLocation } from '@/lib/geocode';
import { saveTripCustomFields, saveTripLinks } from '@/lib/trip-extras';

// See docs/api.md §3. Only `type: social` trips are supported until
// agencies (tours) land — both `visibility: public` (open social trips)
// and `visibility: private` (invite-only plans, Phase 3) are creatable.
export async function POST(request: Request) {
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

  // The client-side map editor (components/trips/trip-map-editor.tsx)
  // usually already supplies lat/lng via /api/geocode + optional manual
  // drag/click adjustment. Only fall back to a server-side geocode if it
  // didn't — e.g. the user skipped the picker entirely. Best-effort either
  // way: a trip is still valid with just its free-text location if this
  // can't resolve it, it just won't get a pin on the feed's map view.
  let lat = validated.data.lat ?? null;
  let lng = validated.data.lng ?? null;
  if (lat == null || lng == null) {
    const geocoded = await geocodeLocation(validated.data.locationName);
    lat = geocoded?.lat ?? null;
    lng = geocoded?.lng ?? null;
  }

  const { data, error } = await supabase
    .from('trips')
    .insert({
      owner_id: user.id,
      type: 'social',
      visibility: validated.data.visibility ?? 'public',
      status: 'published',
      title: validated.data.title,
      description: validated.data.description,
      category: validated.data.category,
      location_name: validated.data.locationName,
      lat,
      lng,
      start_at: validated.data.startAt,
      end_at: validated.data.endAt,
      capacity: validated.data.capacity ?? null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '42501') {
      return NextResponse.json(
        { error: { code: 'ERR_ACCOUNT_NOT_ACTIVE', message: error.message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { code: 'ERR_CREATE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  if (validated.data.waypoints && validated.data.waypoints.length > 0) {
    const { error: waypointsError } = await supabase.from('trip_waypoints').insert(
      validated.data.waypoints.map((wp, index) => ({
        trip_id: data.id,
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

  await saveTripCustomFields(supabase, data.id, validated.data.customFields);
  await saveTripLinks(supabase, data.id, user.id, validated.data.links);

  return NextResponse.json({ id: data.id }, { status: 201 });
}
