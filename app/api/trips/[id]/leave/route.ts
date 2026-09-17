import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_NOT_JOINED: 409,
};

// See docs/api.md §3. Auto-promotes the longest-waiting waitlisted attendee
// when a confirmed seat frees up, inside leave_trip() (migration 0004).
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

  const { error } = await supabase.rpc('leave_trip', { p_trip_id: id });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('leave_trip RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
