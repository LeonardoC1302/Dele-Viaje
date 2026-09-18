import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchRoutePath } from '@/lib/route';

// Thin authenticated proxy around OSRM's public demo server, same
// reasoning as /api/geocode: keeps this from being an open, unrate-
// limited proxy to a third-party service that explicitly asks callers to
// go easy on it.
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
  const coordsParam = searchParams.get('coords');

  if (!coordsParam) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Missing coords.' } },
      { status: 422 }
    );
  }

  const stops = coordsParam.split(';').map((pair) => {
    const [lng, lat] = pair.split(',').map(Number);
    return { lat, lng };
  });

  const valid =
    stops.length >= 2 &&
    stops.length <= 20 &&
    stops.every((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));

  if (!valid) {
    return NextResponse.json(
      { error: { code: 'ERR_VALIDATION', message: 'Invalid coords.' } },
      { status: 422 }
    );
  }

  const coordinates = await fetchRoutePath(stops);
  return NextResponse.json({ coordinates });
}
