import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_NOT_FOUND: 404,
  ERR_OWNER_MUST_TRANSFER: 409,
  ERR_NOT_MEMBER: 409,
};

// See migration 0019: private-plan-only leave (leave_trip() is for public
// trips and handles waitlist promotion, which doesn't apply here).
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

  const { error } = await supabase.rpc('leave_plan', { p_trip_id: id });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('leave_plan RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
