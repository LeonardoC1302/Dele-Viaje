import * as z from 'zod';
import { CATEGORY_KEYS } from '@/lib/constants/categories';
import { tripWaypointSchema, tripCustomFieldSchema, tripLinkSchema } from '@/lib/validators/trip';

export const agencyApplySchema = z.object({
  businessName: z.string().trim().min(3).max(120),
  legalName: z.string().trim().max(160).optional(),
  legalId: z.string().trim().max(60).optional(),
  description: z.string().trim().max(2000).optional(),
  locationName: z.string().trim().max(160).optional(),
  sinpePhone: z.string().trim().max(20).optional(),
});

export const agencyEditSchema = z.object({
  businessName: z.string().trim().min(3).max(120),
  legalName: z.string().trim().max(160).optional(),
  legalId: z.string().trim().max(60).optional(),
  description: z.string().trim().max(2000).optional(),
  locationName: z.string().trim().max(160).optional(),
  sinpePhone: z.string().trim().max(20).optional(),
});

export const addAgencyStaffSchema = z.object({
  email: z.email().max(254),
  role: z.enum(['admin', 'staff']),
});

// A tour is deliberately a separate schema from createTripSchema rather
// than that schema growing an optional-fields-required-when-type='tour'
// refinement — capacity/price are always required here (mirrors the
// trips_tour_requires_fields DB check), there's no visibility choice
// (tours are always public), and it's created through its own
// /api/agencies/[id]/tours route with agency-staff authorization, not
// POST /api/trips.
export const createTourSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(1).max(4000),
    category: z.enum(CATEGORY_KEYS),
    locationName: z.string().trim().min(2).max(160),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    waypoints: z.array(tripWaypointSchema).max(20).optional(),
    customFields: z.array(tripCustomFieldSchema).max(20).optional(),
    links: z.array(tripLinkSchema).max(10).optional(),
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    capacity: z.number().int().min(1).max(500),
    minParticipants: z.number().int().min(1).max(500).optional().nullable(),
    priceCrc: z.number().int().min(1000).max(10_000_000),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    error: 'End date must be after the start date.',
    path: ['endAt'],
  })
  .refine((data) => data.minParticipants == null || data.minParticipants <= data.capacity, {
    error: 'Minimum participants cannot exceed capacity.',
    path: ['minParticipants'],
  });

export type CreateTourInput = z.infer<typeof createTourSchema>;
