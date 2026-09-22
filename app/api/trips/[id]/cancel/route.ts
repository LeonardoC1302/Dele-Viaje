import { NextResponse } from 'next/server';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/server';

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_FORBIDDEN: 403,
  ERR_NOT_FOUND: 404,
  ERR_REASON_REQUIRED: 422,
  ERR_RATE_LIMITED: 429,
};

const cancelSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

/**
 * Cancels a trip with a reason and notifies its attendees.
 *
 * All of the authorization, the status flip and the notification writes
 * happen inside `cancel_trip()` (migration 0035) so they're atomic —
 * there is no window where the trip reads as cancelled but nobody was
 * told. The reason is validated here too so a bad request gets a 422
 * with field errors rather than a raw Postgres exception.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const validated = cancelSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      {
        error: {
          code: 'ERR_REASON_REQUIRED',
          message: 'A reason is required.',
          fields: validated.error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    );
  }

  const { error } = await supabase.rpc('cancel_trip', {
    p_trip_id: id,
    p_reason: validated.data.reason,
  });

  if (error) {
    const code = error.message;
    if (!(code in ERROR_STATUS)) {
      console.error('cancel_trip RPC failed:', error);
    }
    return NextResponse.json(
      { error: { code, message: code } },
      { status: ERROR_STATUS[code] ?? 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
