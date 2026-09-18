import * as z from 'zod';
import { CATEGORY_KEYS } from '@/lib/constants/categories';

export const tripWaypointSchema = z.object({
  label: z.string().trim().min(1).max(160),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  kind: z.enum(['meeting_point', 'stop']),
});

export const createTripSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(1).max(2000),
    category: z.enum(CATEGORY_KEYS),
    locationName: z.string().trim().min(2).max(160),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    waypoints: z.array(tripWaypointSchema).max(20).optional(),
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    capacity: z.number().int().min(1).max(500).optional().nullable(),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    error: 'End date must be after the start date.',
    path: ['endAt'],
  });

export type CreateTripInput = z.infer<typeof createTripSchema>;
