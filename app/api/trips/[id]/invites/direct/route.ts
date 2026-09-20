import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_ACCOUNT_NOT_ACTIVE: 403,
  ERR_NOT_FOUND: 404,
  ERR_FORBIDDEN: 403,
  ERR_USER_NOT_FOUND: 404,
  ERR_CANNOT_INVITE_SELF: 422,
  ERR_ALREADY_MEMBER: 409,
};

// See migration 0019: create_direct_plan_invite() looks the invitee up by
// email server-side (profiles has no email/username column) and delivers
// the invite as an in-app notification rather than a copy-pasted link.
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
  const email = typeof body?.email === 'string' ? body.email.trim() : '';

  if (!email || email.length > 254 || !email.includes('@')) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Invalid email.' } },
      { status: 422 }
    );
  }

  const { error } = await supabase.rpc('create_direct_plan_invite', {
    p_trip_id: id,
    p_email: email,
  });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('create_direct_plan_invite RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
