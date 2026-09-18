import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { geocodeLocation } from '@/lib/geocode';

// Thin authenticated proxy around Nominatim so the trip form can preview a
// pin before submitting. Auth-gated (not IP-gated) mainly to keep this
// from being an open, unrate-limited proxy to a third-party service that
// asks callers to be considerate about request volume.
export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Query too short.' } },
      { status: 422 }
    );
  }

  const result = await geocodeLocation(q);
  return NextResponse.json({ result });
}
