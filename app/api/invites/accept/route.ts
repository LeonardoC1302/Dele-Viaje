import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_ACCOUNT_NOT_ACTIVE: 403,
  ERR_INVITE_INVALID: 404,
  ERR_INVITE_EXPIRED: 410,
  ERR_INVITE_EXHAUSTED: 410,
};

export async function POST(request: Request) {
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
  const token = body?.token;

  if (typeof token !== 'string') {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Missing token.' } },
      { status: 422 }
    );
  }

  const { data, error } = await supabase.rpc('accept_plan_invite', { p_token: token });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('accept_plan_invite RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ tripId: data as string });
}
