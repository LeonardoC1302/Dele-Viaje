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
