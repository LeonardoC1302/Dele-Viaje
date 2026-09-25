import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTripSchema } from '@/lib/validators/trip';
import { createTourSchema } from '@/lib/validators/agency';
import { saveTripCustomFields,
  saveTripAdvisories, saveTripRoutes, saveTripLinks, saveTourExclusiveContent } from '@/lib/trip-extras';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// A tour is agency-owned, not personally owned — any of that agency's
// active staff should be able to edit/delete it, not just whoever
// personally clicked "create". Mirrors is_host_team() (migration 0022)
// at the application layer, since this route needs to know *why* it's
// allowing the request (to pick the right validator/branch below), not
// just whether RLS would allow the write.
async function canManageTrip(
  supabase: SupabaseServerClient,
  trip: { owner_id: string; agency_id: string | null },
  userId: string
) {
  if (trip.owner_id === userId) return true;
  if (!trip.agency_id) return false;
  const { data } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', trip.agency_id)
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  return !!data;
}

// See docs/api.md §3. RLS ("trips: owner or host team updates") is the
// real enforcement; the checks here just give clean 403s and pick the
// right validator for a tour vs. a social trip.
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
    .select('id, owner_id, type, agency_id')
    .eq('id', id)
    .single();

  if (!trip) {
    return NextResponse.json(
      { error: { code: 'ERR_NOT_FOUND', message: 'Trip not found.' } },
      { status: 404 }
    );
  }

  if (!(await canManageTrip(supabase, trip, user.id))) {
    return NextResponse.json(
      { error: { code: 'ERR_FORBIDDEN', message: 'You cannot edit this trip.' } },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  if (trip.type === 'tour') {
    const validated = createTourSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: { code: 'ERR_VALIDATION', message: 'Invalid tour data.', issues: validated.error.flatten() } },
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
        capacity: validated.data.capacity,
        min_participants: validated.data.minParticipants ?? null,
        price_crc: validated.data.priceCrc,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: { code: 'ERR_UPDATE_FAILED', message: error.message } },
        { status: 500 }
      );
    }

    await supabase.from('trip_waypoints').delete().eq('trip_id', id);
    if (validated.data.waypoints && validated.data.waypoints.length > 0) {
      await supabase.from('trip_waypoints').insert(
        validated.data.waypoints.map((wp, index) => ({
          trip_id: id,
          label: wp.label,
          lat: wp.lat,
          lng: wp.lng,
          kind: wp.kind,
          sort: index,
        }))
      );
    }
    await supabase.from('trip_custom_fields').delete().eq('trip_id', id);
    await saveTripCustomFields(supabase, id, validated.data.customFields);
    await supabase.from('trip_advisories').delete().eq('trip_id', id);
    await saveTripAdvisories(supabase, id, validated.data.advisories);
    await supabase.from('trip_routes').delete().eq('trip_id', id);
    await saveTripRoutes(supabase, id, user.id, validated.data.routes);
    await supabase.from('trip_links').delete().eq('trip_id', id);
    await saveTripLinks(supabase, id, user.id, validated.data.links);
    await saveTourExclusiveContent(supabase, id, validated.data.exclusiveContent);

    return NextResponse.json({ id });
  }

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

  // Same wholesale-replace approach as waypoints above. Note this means
  // every edit re-fetches OG previews for all links, even unchanged ones
  // — acceptable at plan-editing frequency, revisit if that proves wasteful.
  await supabase.from('trip_custom_fields').delete().eq('trip_id', id);
  await saveTripCustomFields(supabase, id, validated.data.customFields);
  await supabase.from('trip_advisories').delete().eq('trip_id', id);
  await saveTripAdvisories(supabase, id, validated.data.advisories);
  await supabase.from('trip_routes').delete().eq('trip_id', id);
  await saveTripRoutes(supabase, id, user.id, validated.data.routes);

  await supabase.from('trip_links').delete().eq('trip_id', id);
  await saveTripLinks(supabase, id, user.id, validated.data.links);

  return NextResponse.json({ id });
}

// Organizer-or-host-team. RLS ("trips: owner or host team deletes") is the
// real enforcement; the check here just gives a clean 403. Everything
// keyed off trip_id (attendees, messages, waypoints, custom fields, links,
// plan_invites, packing_items, expenses, polls, itinerary_blocks,
// tour_questions) cascades via `on delete cascade` foreign keys — see the
// original table definitions — so no manual cleanup is needed here.
export async function DELETE(
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
    .select('id, owner_id, type, agency_id')
    .eq('id', id)
    .single();

  if (!trip) {
    return NextResponse.json(
      { error: { code: 'ERR_NOT_FOUND', message: 'Trip not found.' } },
      { status: 404 }
    );
  }

  if (!(await canManageTrip(supabase, trip, user.id))) {
    return NextResponse.json(
      { error: { code: 'ERR_FORBIDDEN', message: 'You cannot delete this trip.' } },
      { status: 403 }
    );
  }

  const { error } = await supabase.from('trips').delete().eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_DELETE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ id });
}
