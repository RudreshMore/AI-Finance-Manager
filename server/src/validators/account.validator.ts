import { z } from 'zod';
import { AccountType } from '@prisma/client';

export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Account name is required')
    .max(100, 'Account name cannot exceed 100 characters'),
  type: z.nativeEnum(AccountType).default(AccountType.BANK),
  initialBalance: z
    .union([z.number(), z.string()])
    .default(0)
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error('Initial balance must be a valid number');
      return num;
    }),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(10)
    .default('INR'),
});

export const updateAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Account name is required')
    .max(100, 'Account name cannot exceed 100 characters')
    .optional(),
  type: z.nativeEnum(AccountType).optional(),
  isArchived: z.boolean().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
