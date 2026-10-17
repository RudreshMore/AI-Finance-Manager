import { z } from 'zod';

export const chatInputSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant'], {
          errorMap: () => ({ message: 'Role must be either "user" or "assistant"' }),
        }),
        content: z.string().max(2500, 'Conversation message content too long'),
      })
    )
    .max(50, 'Conversation history cannot exceed 50 messages')
    .optional(),
});

export const monthlySummaryQuerySchema = z.object({
  month: z.coerce
    .number()
    .int()
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12')
    .optional(),
  year: z.coerce
    .number()
    .int()
    .min(2000, 'Year must be at least 2000')
    .max(2100, 'Year must be at most 2100')
    .optional(),
});

export type ChatInput = z.infer<typeof chatInputSchema>;
export type MonthlySummaryQuery = z.infer<typeof monthlySummaryQuerySchema>;
