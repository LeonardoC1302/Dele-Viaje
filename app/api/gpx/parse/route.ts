import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildRoute, GpxError } from '@/lib/gpx';

/**
 * Parses an uploaded GPX file and hands back a compact route.
 *
 * WHY PARSING IS ITS OWN ENDPOINT
 * A route is created as part of a trip, and while the trip form is open
 * the trip does not exist yet — there is no id to hang a row off. So the
 * file is parsed here, the form holds the compact result in state, and
 * the routes are written alongside everything else when the trip is
 * saved (see saveTripRoutes in lib/trip-extras.ts). Nothing is persisted
 * by this endpoint, which is also why it takes no trip id and needs no
 * host-team check — any signed-in user can measure a file they hold.
 *
 * The body is the raw file text rather than multipart form data: there
 * is exactly one field, and `request.text()` avoids pulling in a
 * multipart parser to find it.
 */

/** Well past any real GPX; a 12 MB track is ~300k points. */
const MAX_BYTES = 12 * 1024 * 1024;

const ERROR_STATUS: Record<string, number> = {
  ERR_UNAUTHENTICATED: 401,
  ERR_GPX_TOO_LARGE: 413,
  ERR_GPX_INVALID: 422,
  ERR_GPX_EMPTY: 422,
  ERR_RATE_LIMITED: 429,
};

function fail(code: string) {
  return NextResponse.json(
    { error: { code, message: code } },
    { status: ERROR_STATUS[code] ?? 500 }
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return fail('ERR_UNAUTHENTICATED');

  // Refuse on the declared length before reading, so an oversized upload
  // is rejected without buffering it.
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) return fail('ERR_GPX_TOO_LARGE');

  // Parsing and simplifying up to 200k points is the most expensive thing
  // an ordinary account can ask this server to do, so it is throttled
  // alongside the other abusable paths (migration 0034). The limiter
  // no-ops for server-side callers with no JWT, by design.
  const { error: limitError } = await supabase.rpc('enforce_rate_limit', {
    p_action: 'gpx_import',
    p_max: 40,
    p_window: '01:00:00',
  });
  if (limitError) {
    if (limitError.message.includes('ERR_RATE_LIMITED')) return fail('ERR_RATE_LIMITED');
    // A limiter that is itself broken (say, migration 0034 not applied)
    // must not block the feature it protects.
    console.error('enforce_rate_limit failed for gpx_import:', limitError);
  }

  const xml = await request.text();
  // Content-Length can lie or be absent (chunked); this is the real check.
  if (xml.length > MAX_BYTES) return fail('ERR_GPX_TOO_LARGE');

  try {
    const route = buildRoute(xml);
    return NextResponse.json({ route });
  } catch (error) {
    if (error instanceof GpxError) return fail(error.code);
    console.error('GPX parse failed:', error);
    return fail('ERR_GPX_INVALID');
  }
}
