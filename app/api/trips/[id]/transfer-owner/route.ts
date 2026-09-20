import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_NOT_FOUND: 404,
  ERR_FORBIDDEN: 403,
  ERR_ALREADY_OWNER: 409,
  ERR_NOT_MEMBER: 409,
};

// See migration 0019: transfer_plan_ownership() — organizer-only, target
// must already be a confirmed member.
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
  const newOwnerId = body?.newOwnerId;

  if (typeof newOwnerId !== 'string') {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Missing newOwnerId.' } },
      { status: 422 }
    );
  }

  const { error } = await supabase.rpc('transfer_plan_ownership', {
    p_trip_id: id,
    p_new_owner_id: newOwnerId,
  });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('transfer_plan_ownership RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
