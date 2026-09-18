import * as z from 'zod';

export const REPORT_TARGET_TYPES = ['trip', 'user', 'message'] as const;

export const REPORT_REASONS = [
  'spam',
  'inappropriate',
  'safety',
  'harassment',
  'other',
] as const;

export const createReportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  description: z.string().trim().max(2000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
