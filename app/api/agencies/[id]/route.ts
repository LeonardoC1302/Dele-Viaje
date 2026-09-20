import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { agencyEditSchema } from '@/lib/validators/agency';

// RLS ("agencies: staff edit profile, admin manage all") is the real
// enforcement; this is just a clean 4xx instead of a generic RLS error.
// `status` is never accepted here — see set_agency_status() (admin route)
// and the column grant in migration 0022.
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

  const body = await request.json().catch(() => null);
  const validated = agencyEditSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Invalid agency data.', issues: validated.error.flatten() } },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from('agencies')
    .update({
      business_name: validated.data.businessName,
      legal_name: validated.data.legalName ?? null,
      legal_id: validated.data.legalId ?? null,
      description: validated.data.description ?? null,
      location_name: validated.data.locationName ?? null,
      sinpe_phone: validated.data.sinpePhone ?? null,
    })
    .eq('id', id);

  if (error) {
    const code = error.code === '42501' ? 'ERR_FORBIDDEN' : 'ERR_UPDATE_FAILED';
    return NextResponse.json(
      { error: { code, message: error.message } },
      { status: code === 'ERR_FORBIDDEN' ? 403 : 500 }
    );
  }

  return NextResponse.json({ id });
}
