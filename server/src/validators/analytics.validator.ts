import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  period: z
    .enum([
      'this_month',
      'last_month',
      'last_3_months',
      'last_6_months',
      'this_year',
      'all',
      'custom',
    ])
    .optional()
    .default('this_month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type AnalyticsQueryParams = z.infer<typeof analyticsQuerySchema>;
