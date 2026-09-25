import { createClient } from '@/lib/supabase/server';
import { toGpxDocument } from '@/lib/gpx';

/**
 * Serves a route back as a GPX file, for a watch or another app.
 *
 * Rebuilt from what we stored rather than streamed from a kept copy of
 * the upload — see the note on toGpxDocument in lib/gpx.ts for why the
 * original file isn't retained. Authorization is left entirely to the
 * `trip_routes: read with trip` policy (migration 0037): this runs with
 * the caller's own session, so a route on a private plan simply returns
 * no row for someone who isn't a member.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; routeId: string }> }
) {
  const { id, routeId } = await params;
  const supabase = await createClient();

  const { data: route } = await supabase
    .from('trip_routes')
    .select('name, geometry, profile')
    .eq('id', routeId)
    .eq('trip_id', id)
    .maybeSingle();

  if (!route) {
    return new Response('Not found', { status: 404 });
  }

  const xml = toGpxDocument(
    route.name,
    route.geometry as [number, number][],
    (route.profile as [number, number][] | null) ?? null
  );

  // ASCII-only filename with a UTF-8 fallback: a Costa Rican trail name
  // is full of accents, and a raw one in this header is not portable.
  const safeName = route.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'route';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/gpx+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}.gpx"; filename*=UTF-8''${encodeURIComponent(route.name)}.gpx`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
