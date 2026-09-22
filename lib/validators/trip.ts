import * as z from 'zod';
import { CATEGORY_KEYS } from '@/lib/constants/categories';

export const tripWaypointSchema = z.object({
  label: z.string().trim().min(1).max(160),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  kind: z.enum(['meeting_point', 'stop']),
});

export const tripCustomFieldSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
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
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    capacity: z.number().int().min(1).max(500).optional().nullable(),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    error: 'End date must be after the start date.',
    path: ['endAt'],
  });

export type CreateTripInput = z.infer<typeof createTripSchema>;
