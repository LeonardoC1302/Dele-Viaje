import * as z from 'zod';
import { CATEGORY_KEYS } from '@/lib/constants/categories';

export const createTripSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(1).max(2000),
    category: z.enum(CATEGORY_KEYS),
    locationName: z.string().trim().min(2).max(160),
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    capacity: z.number().int().min(1).max(500).optional().nullable(),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    error: 'End date must be after the start date.',
    path: ['endAt'],
  });

export type CreateTripInput = z.infer<typeof createTripSchema>;
