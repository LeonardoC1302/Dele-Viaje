import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tourTemplateSchema } from '@/lib/validators/agency';

async function requireStaff(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencyId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json(
      { error: { code: 'ERR_UNAUTHENTICATED', message: 'Sign in required.' } },
      { status: 401 }
    ) };
  }

  const { data: membership } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return { error: NextResponse.json(
      { error: { code: 'ERR_FORBIDDEN', message: 'Only agency staff can manage templates.' } },
      { status: 403 }
    ) };
  }

  return { error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { id, templateId } = await params;
  const supabase = await createClient();

  const { error: authError } = await requireStaff(supabase, id);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const validated = tourTemplateSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Invalid template data.', issues: validated.error.flatten() } },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from('tour_templates')
    .update({
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
    .eq('id', templateId)
    .eq('agency_id', id);

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_UPDATE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { id, templateId } = await params;
  const supabase = await createClient();

  const { error: authError } = await requireStaff(supabase, id);
  if (authError) return authError;

  const { error } = await supabase
    .from('tour_templates')
    .delete()
    .eq('id', templateId)
    .eq('agency_id', id);

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_DELETE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
