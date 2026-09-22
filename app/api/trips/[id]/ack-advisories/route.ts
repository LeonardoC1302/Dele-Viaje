import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Records that the caller confirmed reading a trip's safety advisories.
 *
 * Writes through `ack_trip_advisories()` (migration 0033) rather than a
 * direct update, because RLS cannot restrict which columns an update
 * touches: a policy permissive enough to let an attendee stamp their own
 * `advisories_ack_at` would also let them rewrite their own `status`
 * ('waitlisted' -> 'confirmed') or `payment_status` ('none' -> 'paid').
 * Same reason the buyer's payment writes go through
 * submit_payment_evidence() in migration 0026.
 *
 * The function is idempotent — it only stamps a row where
 * advisories_ack_at is null — so the first acknowledgement is the one on
 * record and a retry can't move the timestamp.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { error } = await supabase.rpc('ack_trip_advisories', { p_trip_id: id });

  if (error) {
    console.error('ack_trip_advisories RPC failed:', error);
    return NextResponse.json(
      { error: { code: 'ERR_ACK_FAILED', message: 'Could not record acknowledgement.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
