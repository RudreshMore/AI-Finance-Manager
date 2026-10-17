import { z } from 'zod';

const positiveAmount = z
  .union([z.number(), z.string()])
  .refine(
    (val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num > 0 && num <= 999999999999.99;
    },
    { message: 'Target amount must be strictly greater than 0' }
  )
  .transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return Math.round(num * 100) / 100;
  });

const nonNegativeAmount = z
  .union([z.number(), z.string()])
  .refine(
    (val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num >= 0 && num <= 999999999999.99;
    },
    { message: 'Current savings amount cannot be negative' }
  )
  .transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return Math.round(num * 100) / 100;
  });

export const createGoalSchema = z
  .object({
    name: z.string().trim().min(1, 'Goal name is required').max(150, 'Goal name cannot exceed 150 characters'),
    targetAmount: positiveAmount,
    currentAmount: nonNegativeAmount.optional().default(0),
    targetDate: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val && val.trim() !== '' ? new Date(val) : null)),
  })
  .refine(
    (data) => {
      if (data.currentAmount !== undefined && data.currentAmount > data.targetAmount) {
        return false;
      }
      return true;
    },
    {
      message: 'Current savings cannot exceed target amount upon creation',
      path: ['currentAmount'],
    }
  );

export const updateGoalSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    targetAmount: positiveAmount.optional(),
    currentAmount: nonNegativeAmount.optional(),
    targetDate: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val && val.trim() !== '' ? new Date(val) : null)),
    isCompleted: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (
        data.targetAmount !== undefined &&
        data.currentAmount !== undefined &&
        data.currentAmount > data.targetAmount
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Current savings cannot exceed the target amount',
      path: ['currentAmount'],
    }
  );

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
