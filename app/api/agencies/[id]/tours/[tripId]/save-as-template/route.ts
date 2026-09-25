import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Copies a tour's content fields (not its dates or booking state) into a
// new tour_templates row, so an agency can turn an already-built tour
// into a reusable template without retyping it into the template form.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; tripId: string }> }
) {
  const { id, tripId } = await params;
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
      { error: { code: 'ERR_FORBIDDEN', message: 'Only agency staff can manage templates.' } },
      { status: 403 }
    );
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('title, description, category, location_name, lat, lng, capacity, min_participants, price_crc')
    .eq('id', tripId)
    .eq('agency_id', id)
    .eq('type', 'tour')
    .single();

  if (!trip) {
    return NextResponse.json(
      { error: { code: 'ERR_NOT_FOUND', message: 'Tour not found.' } },
      { status: 404 }
    );
  }

  const [waypointsResult, customFieldsResult, linksResult] = await Promise.all([
    supabase.from('trip_waypoints').select('label, lat, lng, kind').eq('trip_id', tripId).order('sort'),
    supabase
      .from('trip_custom_fields')
      .select('label, value, icon')
      .eq('trip_id', tripId)
      .order('sort'),
    supabase.from('trip_links').select('url, label').eq('trip_id', tripId).order('sort'),
  ]);

  const { data, error } = await supabase
    .from('tour_templates')
    .insert({
      agency_id: id,
      created_by: user.id,
      name: trip.title,
      title: trip.title,
      description: trip.description,
      category: trip.category,
      location_name: trip.location_name,
      lat: trip.lat,
      lng: trip.lng,
      waypoints: waypointsResult.data ?? [],
      custom_fields: customFieldsResult.data ?? [],
      links: (linksResult.data ?? []).map((l) => ({ url: l.url, label: l.label ?? '' })),
      capacity: trip.capacity ?? 1,
      min_participants: trip.min_participants,
      price_crc: trip.price_crc ?? 1000,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_CREATE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
