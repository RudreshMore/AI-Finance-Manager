import { z } from 'zod';

const amountValidation = z
  .union([z.number(), z.string()])
  .refine(
    (val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num > 0 && num <= 999999999999.99;
    },
    { message: 'Budget amount must be strictly greater than 0' }
  )
  .transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return Math.round(num * 100) / 100;
  });

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  amount: amountValidation,
  month: z.coerce.number().int().min(1, 'Month must be between 1 and 12').max(12, 'Month must be between 1 and 12'),
  year: z.coerce.number().int().min(2000, 'Year must be 2000 or later').max(2100, 'Year must be 2100 or earlier'),
});

export const updateBudgetSchema = z.object({
  amount: amountValidation,
});

export const budgetQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type BudgetQueryParams = z.infer<typeof budgetQuerySchema>;
