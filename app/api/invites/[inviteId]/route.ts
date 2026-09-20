import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Soft-revoke: sets revoked_at rather than deleting, so the use history
// stays intact for the organizer.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const { inviteId } = await params;
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

  const { error } = await supabase
    .from('plan_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId);

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_REVOKE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
