import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tourTemplateSchema } from '@/lib/validators/agency';

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
      { error: { code: 'ERR_FORBIDDEN', message: 'Only agency staff can manage templates.' } },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const validated = tourTemplateSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Invalid template data.', issues: validated.error.flatten() } },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from('tour_templates')
    .insert({
      agency_id: id,
      created_by: user.id,
      name: validated.data.name,
      title: validated.data.title,
      description: validated.data.description,
      category: validated.data.category,
      location_name: validated.data.locationName,
      lat: validated.data.lat ?? null,
      lng: validated.data.lng ?? null,
      waypoints: validated.data.waypoints ?? [],
      custom_fields: validated.data.customFields ?? [],
      links: validated.data.links ?? [],
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

  return NextResponse.json({ id: data.id }, { status: 201 });
}
