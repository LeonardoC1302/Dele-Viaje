import type { createClient } from '@/lib/supabase/server';
import type { CreateTripInput } from '@/lib/validators/trip';
import { fetchLinkPreview } from '@/lib/link-preview';

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
