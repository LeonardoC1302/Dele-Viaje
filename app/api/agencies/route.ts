import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { agencyApplySchema } from '@/lib/validators/agency';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_ACCOUNT_NOT_ACTIVE: 403,
};

// See migration 0022: apply_for_agency() creates the agency (status
// 'pending') and the applicant's own 'owner' membership atomically.
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
  const validated = agencyApplySchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Invalid agency data.', issues: validated.error.flatten() } },
      { status: 422 }
    );
  }

  const { data, error } = await supabase.rpc('apply_for_agency', {
    p_business_name: validated.data.businessName,
    p_legal_name: validated.data.legalName ?? null,
    p_legal_id: validated.data.legalId ?? null,
    p_description: validated.data.description ?? null,
    p_location_name: validated.data.locationName ?? null,
    p_sinpe_phone: validated.data.sinpePhone ?? null,
  });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('apply_for_agency RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ id: data as string }, { status: 201 });
}
