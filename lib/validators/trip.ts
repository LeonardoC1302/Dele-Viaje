import * as z from 'zod';
import { CATEGORY_KEYS } from '@/lib/constants/categories';
import { CUSTOM_FIELD_ICON_KEYS } from '@/lib/constants/custom-field-icons';

export const tripWaypointSchema = z.object({
  label: z.string().trim().min(1).max(160),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  kind: z.enum(['meeting_point', 'stop']),
});

export const tripCustomFieldSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
  // A key from the curated catalog, never free text — the host picks
  // from a palette, so anything else is a forged request. `nullable`
  // as well as `optional` because the edit form round-trips a cleared
  // icon back as an explicit null.
  icon: z.enum(CUSTOM_FIELD_ICON_KEYS).optional().nullable(),
});

/**
 * A hiking route as the form sends it back after /api/gpx/parse measured
 * it. The caps are generous but finite — lib/gpx.ts targets 2,500 display
 * points and 240 profile samples, so anything near these bounds is
 * already a forged or corrupted payload rather than a big hike.
 *
 * The stats are the client's word for what the server measured a moment
 * earlier. saveTripRoutes cross-checks the distance against the geometry
 * and recomputes the bounding box, which is as far as verification can
 * usefully go: the remaining figures describe the host's own trip, so
 * a wrong one is no worse than a wrong custom field.
 */
export const tripRouteSchema = z.object({
  name: z.string().trim().min(1).max(160),
  // Index into the trip's own stops, not a waypoint id — see the comment
  // on trip_routes.stop_sort in migration 0037.
  stopSort: z.number().int().min(0).max(19).optional().nullable(),
  coordinates: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .min(2)
    .max(3000),
  profile: z.array(z.tuple([z.number(), z.number()])).max(400).optional().nullable(),
  distanceM: z.number().int().min(0).max(5_000_000),
  ascentM: z.number().int().min(0).max(100_000).optional().nullable(),
  descentM: z.number().int().min(0).max(100_000).optional().nullable(),
  minEleM: z.number().int().min(-500).max(9_000).optional().nullable(),
  maxEleM: z.number().int().min(-500).max(9_000).optional().nullable(),
  pointCount: z.number().int().min(2).max(200_000),
});

export const tripLinkSchema = z.object({
  url: z.url().max(2000),
  label: z.string().trim().max(160).optional(),
});

/**
 * An advisory the host attached to the trip.
 *
 * `code` is validated as a shape here but its existence is enforced by
 * the FK to `trip_advisory_types` — deliberately not a z.enum, because
 * the taxonomy is seeded data an admin can extend without a deploy, and
 * hard-coding the codes here would silently reject a new one.
 */
export const tripAdvisorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_]+$/, 'Advisory codes are lowercase snake_case.'),
  note: z.string().trim().max(200).optional(),
});

export const createTripSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(1).max(4000),
    category: z.enum(CATEGORY_KEYS),
    visibility: z.enum(['public', 'private']).optional(),
    locationName: z.string().trim().min(2).max(160),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    waypoints: z.array(tripWaypointSchema).max(20).optional(),
    customFields: z.array(tripCustomFieldSchema).max(20).optional(),
    links: z.array(tripLinkSchema).max(10).optional(),
    advisories: z.array(tripAdvisorySchema).max(18).optional(),
    routes: z.array(tripRouteSchema).max(5).optional(),
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    capacity: z.number().int().min(1).max(500).optional().nullable(),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    error: 'End date must be after the start date.',
    path: ['endAt'],
  });

export type CreateTripInput = z.infer<typeof createTripSchema>;
