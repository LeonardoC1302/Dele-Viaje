import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_NOT_FOUND: 404,
  ERR_TRIP_NOT_JOINABLE: 409,
  ERR_JOIN_DEADLINE_PASSED: 409,
  ERR_TRIP_STARTED: 409,
  ERR_ALREADY_JOINED: 409,
};

// See docs/api.md §3. Seat admission (confirmed vs waitlisted) is decided
// transactionally inside join_trip() (migration 0005) to prevent oversell.
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

  const { data, error } = await supabase.rpc('join_trip', { p_trip_id: id });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('join_trip RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ status: data as string });
}
