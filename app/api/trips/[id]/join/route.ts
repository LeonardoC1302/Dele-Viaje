import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_NOT_FOUND: 404,
  ERR_TRIP_NOT_JOINABLE: 409,
  ERR_JOIN_DEADLINE_PASSED: 409,
  ERR_TRIP_STARTED: 409,
  ERR_ALREADY_JOINED: 409,
  ERR_ACCOUNT_NOT_ACTIVE: 403,
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

  // join_trip() returns `table (status text)` — a set-returning function,
  // not a scalar — so PostgREST hands back an array of rows (`[{status:
  // "confirmed"}]`) unless .single() asks it to unwrap the one row. Without
  // this, `data` was actually that array, and `{status: data}` shipped a
  // nested `{status: [{status: "confirmed"}]}` to the client — JoinTripButton
  // would set its local `status` state to that array instead of the string
  // 'confirmed'/'waitlisted', so its own `status === 'confirmed'` checks
  // silently failed until the page was fully reloaded and re-derived
  // attendeeStatus server-side from the `attendees` table directly.
  const { data, error } = await supabase.rpc('join_trip', { p_trip_id: id }).single();

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

  return NextResponse.json({ status: (data as { status: string }).status });
}
