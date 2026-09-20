import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_FORBIDDEN: 403,
  ERR_INVALID_STATUS: 422,
};

// See migration 0022: set_agency_status() is the only path that can ever
// change an agency's status — checks is_admin() itself (SECURITY
// DEFINER), so this route's own auth check is just for a clean 401/403.
export async function PATCH(
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
  const status = body?.status;

  if (!['pending', 'approved', 'suspended', 'rejected'].includes(status)) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Invalid status.' } },
      { status: 422 }
    );
  }

  const { error } = await supabase.rpc('set_agency_status', {
    p_agency_id: id,
    p_status: status,
  });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('set_agency_status RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
