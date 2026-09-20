import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTourSchema } from '@/lib/validators/agency';
import { geocodeLocation } from '@/lib/geocode';
import { saveTripCustomFields, saveTripLinks, saveTourExclusiveContent } from '@/lib/trip-extras';

// Tours are created as `status: 'draft'` — unlike a social trip (which
// publishes immediately), an agency needs a separate "Publish" action
// (POST .../publish) so it can build out the listing before it's visible
// on the feed, and so publishing can be gated on the agency itself being
// approved (checked at publish time, not creation time — see that route).
export async function POST(
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

  const { data: membership } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: { code: 'ERR_FORBIDDEN', message: 'Only agency staff can create tours.' } },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const validated = createTourSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Invalid tour data.', issues: validated.error.flatten() } },
      { status: 422 }
    );
  }

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
      type: 'tour',
      visibility: 'public',
      status: 'draft',
      agency_id: id,
      title: validated.data.title,
      description: validated.data.description,
      category: validated.data.category,
      location_name: validated.data.locationName,
      lat,
      lng,
      start_at: validated.data.startAt,
      end_at: validated.data.endAt,
      capacity: validated.data.capacity,
      min_participants: validated.data.minParticipants ?? null,
      price_crc: validated.data.priceCrc,
    })
    .select('id')
    .single();

  if (error) {
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
      console.error('Failed to save tour waypoints:', waypointsError);
    }
  }

  await saveTripCustomFields(supabase, data.id, validated.data.customFields);
  await saveTripLinks(supabase, data.id, user.id, validated.data.links);
  await saveTourExclusiveContent(supabase, data.id, validated.data.exclusiveContent);

  // Extra bookable dates for the same tour (migration 0032) — each is its
  // own fully independent `trips` row (own capacity/attendees/chat/
  // reviews), sharing everything but the schedule. `tour_group_id` on
  // every row (including the primary) points at the primary's id, so the
  // trip detail page can find every sibling with one equality filter.
  if (validated.data.additionalDates && validated.data.additionalDates.length > 0) {
    const siblingRows = validated.data.additionalDates.map((d) => ({
      owner_id: user.id,
      type: 'tour' as const,
      visibility: 'public' as const,
      status: 'draft' as const,
      agency_id: id,
      tour_group_id: data.id,
      title: validated.data.title,
      description: validated.data.description,
      category: validated.data.category,
      location_name: validated.data.locationName,
      lat,
      lng,
      start_at: d.startAt,
      end_at: d.endAt,
      capacity: validated.data.capacity,
      min_participants: validated.data.minParticipants ?? null,
      price_crc: validated.data.priceCrc,
    }));

    const { data: siblings } = await supabase.from('trips').insert(siblingRows).select('id');

    for (const sibling of siblings ?? []) {
      if (validated.data.waypoints && validated.data.waypoints.length > 0) {
        await supabase.from('trip_waypoints').insert(
          validated.data.waypoints.map((wp, index) => ({
            trip_id: sibling.id,
            label: wp.label,
            lat: wp.lat,
            lng: wp.lng,
            kind: wp.kind,
            sort: index,
          }))
        );
      }
      await saveTripCustomFields(supabase, sibling.id, validated.data.customFields);
      await saveTripLinks(supabase, sibling.id, user.id, validated.data.links);
      await saveTourExclusiveContent(supabase, sibling.id, validated.data.exclusiveContent);
    }

    await supabase.from('trips').update({ tour_group_id: data.id }).eq('id', data.id);
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
