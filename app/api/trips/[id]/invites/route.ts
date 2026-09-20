import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// See docs/prd.md §4.5 "Invitations — Link with expiry". Direct
// username/email invites are not implemented — see PROJECT_STATUS.md.
export async function GET(
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

  const { data, error } = await supabase
    .from('plan_invites')
    .select('id, token, expires_at, max_uses, uses, revoked_at, created_at')
    .eq('trip_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_LIST_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ invites: data });
}

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

  const body = await request.json().catch(() => ({}));
  const expiresInHours =
    typeof body?.expiresInHours === 'number' && body.expiresInHours > 0
      ? Math.min(body.expiresInHours, 24 * 30)
      : 24 * 7;
  const maxUses =
    typeof body?.maxUses === 'number' && body.maxUses > 0 ? Math.min(body.maxUses, 500) : null;

  const { data, error } = await supabase
    .from('plan_invites')
    .insert({
      trip_id: id,
      created_by: user.id,
      expires_at: new Date(Date.now() + expiresInHours * 3600_000).toISOString(),
      max_uses: maxUses,
    })
    .select('id, token, expires_at, max_uses, uses, revoked_at, created_at')
    .single();

  if (error) {
    const code = error.code === '42501' ? 'ERR_FORBIDDEN' : 'ERR_CREATE_FAILED';
    return NextResponse.json(
      { error: { code, message: error.message } },
      { status: code === 'ERR_FORBIDDEN' ? 403 : 500 }
    );
  }

  return NextResponse.json({ invite: data }, { status: 201 });
}
