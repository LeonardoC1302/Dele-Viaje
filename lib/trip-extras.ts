import type { createClient } from '@/lib/supabase/server';
import type { CreateTripInput } from '@/lib/validators/trip';
import { fetchLinkPreview } from '@/lib/link-preview';
import { haversineKm } from '@/lib/geo';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Shared by POST /api/trips and PATCH /api/trips/[id] — both need to
// (re)save waypoints/custom fields/links alongside the trip row itself.

export async function saveTripCustomFields(
  supabase: SupabaseServerClient,
  tripId: string,
  customFields: CreateTripInput['customFields']
) {
  if (!customFields || customFields.length === 0) return;

  const { error } = await supabase.from('trip_custom_fields').insert(
    customFields.map((field, index) => ({
      trip_id: tripId,
      label: field.label,
      value: field.value,
      icon: field.icon ?? null,
      sort: index,
    }))
  );
  if (error) {
    console.error('Failed to save trip custom fields:', error);
  }
}

/**
 * Saves the trip's advisory selections.
 *
 * De-duplicates by code before inserting: `trip_advisories` is keyed on
 * (trip_id, code), so a client that somehow sent the same code twice
 * would fail the whole insert rather than just ignoring the duplicate.
 * An empty note is stored as NULL, not '', because the column's check
 * constraint requires 1..200 characters when present.
 */
export async function saveTripAdvisories(
  supabase: SupabaseServerClient,
  tripId: string,
  advisories: CreateTripInput['advisories']
) {
  if (!advisories || advisories.length === 0) return;

  const byCode = new Map(advisories.map((a) => [a.code, a]));
  const rows = [...byCode.values()].map((a) => ({
    trip_id: tripId,
    code: a.code,
    note: a.note && a.note.trim() ? a.note.trim() : null,
  }));

  const { error } = await supabase.from('trip_advisories').insert(rows);
  if (error) {
    // Logged, not thrown, matching the other extras helpers: the trip
    // itself already saved, and failing the whole request here would
    // leave the caller thinking nothing was created.
    console.error('Failed to save trip advisories:', error);
  }
}

/**
 * Saves the trip's hiking routes.
 *
 * The geometry and stats arrive from the client, which got them from
 * /api/gpx/parse moments earlier. Two things are therefore not taken on
 * trust:
 *
 *  - the bounding box is recomputed here, since it is derived data and
 *    there is no reason to accept a version of it;
 *  - the claimed distance is checked against the distance implied by the
 *    geometry. Simplification cuts corners, so the two never match
 *    exactly, but they stay within a few percent on any real track —
 *    a claim outside half to double the measured line is a forged or
 *    corrupted payload, and the measured value replaces it.
 *
 * The remaining figures (ascent, elevation range) can't be recovered
 * from simplified geometry and describe the host's own trip, so they are
 * stored as sent, exactly like a custom field's text.
 */
export async function saveTripRoutes(
  supabase: SupabaseServerClient,
  tripId: string,
  userId: string,
  routes: CreateTripInput['routes']
) {
  if (!routes || routes.length === 0) return;

  const rows = routes.map((route, index) => {
    const coordinates = route.coordinates;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    let measured = 0;
    for (let i = 0; i < coordinates.length; i++) {
      const [lng, lat] = coordinates[i];
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
      if (i > 0) {
        const [prevLng, prevLat] = coordinates[i - 1];
        measured += haversineKm(prevLat, prevLng, lat, lng) * 1000;
      }
    }

    const plausible =
      route.distanceM >= measured * 0.5 && route.distanceM <= Math.max(measured * 2, 100);

    return {
      trip_id: tripId,
      stop_sort: route.stopSort ?? null,
      name: route.name,
      geometry: coordinates,
      profile: route.profile ?? null,
      distance_m: plausible ? route.distanceM : Math.round(measured),
      ascent_m: route.ascentM ?? null,
      descent_m: route.descentM ?? null,
      min_ele_m: route.minEleM ?? null,
      max_ele_m: route.maxEleM ?? null,
      // Can't be below the number of points we were actually given.
      point_count: Math.max(route.pointCount, coordinates.length),
      bbox: [minLng, minLat, maxLng, maxLat],
      sort: index,
      created_by: userId,
    };
  });

  const { error } = await supabase.from('trip_routes').insert(rows);
  if (error) {
    console.error('Failed to save trip routes:', error);
  }
}

export async function saveTripLinks(
  supabase: SupabaseServerClient,
  tripId: string,
  userId: string,
  links: CreateTripInput['links']
) {
  if (!links || links.length === 0) return;

  const rows = await Promise.all(
    links.map(async (link, index) => {
      const preview = await fetchLinkPreview(link.url);
      return {
        trip_id: tripId,
        url: link.url,
        label: link.label || null,
        og_title: preview?.title ?? null,
        og_description: preview?.description ?? null,
        og_image_url: preview?.imageUrl ?? null,
        sort: index,
        created_by: userId,
      };
    })
  );

  const { error } = await supabase.from('trip_links').insert(rows);
  if (error) {
    console.error('Failed to save trip links:', error);
  }
}

// Upserts or clears a tour's exclusive-content row depending on whether
// the field was left blank. A separate helper (not folded into the trips
// insert/update itself) since it targets a different table — see
// migration 0030 for why exclusive_content isn't a trips column.
export async function saveTourExclusiveContent(
  supabase: SupabaseServerClient,
  tripId: string,
  content: string | undefined
) {
  if (content && content.trim()) {
    const { error } = await supabase
      .from('tour_exclusive_content')
      .upsert({ trip_id: tripId, content: content.trim() }, { onConflict: 'trip_id' });
    if (error) {
      console.error('Failed to save tour exclusive content:', error);
    }
    return;
  }

  const { error } = await supabase.from('tour_exclusive_content').delete().eq('trip_id', tripId);
  if (error) {
    console.error('Failed to clear tour exclusive content:', error);
  }
}
