import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Gated on the *agency* being approved, not the tour itself — the PRD
// treats tour admin-review as an optional toggle, not mandatory for MVP,
// so the only real gate before a tour hits the public feed is that the
// agency behind it has passed approval.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; tripId: string }> }
) {
  const { id, tripId } = await params;
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

  const { data: membership } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: { code: 'ERR_FORBIDDEN', message: 'Only agency staff can publish tours.' } },
      { status: 403 }
    );
  }

  const { data: agency } = await supabase.from('agencies').select('status').eq('id', id).single();

  if (agency?.status !== 'approved') {
    return NextResponse.json(
      { error: { code: 'ERR_AGENCY_NOT_APPROVED', message: 'The agency must be approved before publishing tours.' } },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('trips')
    .update({ status: 'published' })
    .eq('id', tripId)
    .eq('agency_id', id);

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_PUBLISH_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
