import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addAgencyStaffSchema } from '@/lib/validators/agency';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_FORBIDDEN: 403,
  ERR_INVALID_ROLE: 422,
  ERR_USER_NOT_FOUND: 404,
};

// See migration 0022: add_agency_staff_by_email() looks the invitee up by
// email against auth.users (same pattern as create_direct_plan_invite())
// and adds them straight to 'active' — no accept step, an owner adding a
// known colleague isn't the same trust boundary as inviting a stranger
// into a private plan.
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

  const body = await request.json().catch(() => null);
  const validated = addAgencyStaffSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Invalid data.', issues: validated.error.flatten() } },
      { status: 422 }
    );
  }

  const { error } = await supabase.rpc('add_agency_staff_by_email', {
    p_agency_id: id,
    p_email: validated.data.email,
    p_role: validated.data.role,
  });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('add_agency_staff_by_email RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
