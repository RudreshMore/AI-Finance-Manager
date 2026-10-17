import { z } from 'zod';
import { TransactionType } from '@prisma/client';

const amountValidation = z
  .union([z.number(), z.string()])
  .refine(
    (val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num > 0 && num <= 999999999999.99;
    },
    {
      message: 'Amount must be a valid positive number not exceeding 999,999,999,999.99',
    }
  )
  .transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return Math.round(num * 100) / 100;
  });

export const createTransactionSchema = z
  .object({
    type: z.nativeEnum(TransactionType),
    amount: amountValidation,
    accountId: z.string().uuid('Invalid account ID'),
    destinationAccountId: z.string().uuid('Invalid destination account ID').optional(),
    categoryId: z.string().uuid('Invalid category ID').optional(),
    description: z.string().trim().max(1000).optional(),
    transactionDate: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : new Date())),
  })
  .refine(
    (data) => {
      if (data.type === TransactionType.TRANSFER) {
        return !!data.destinationAccountId && data.accountId !== data.destinationAccountId;
      }
      return true;
    },
    {
      message: 'Transfer requires a distinct destination account',
      path: ['destinationAccountId'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== TransactionType.TRANSFER) {
        return !!data.categoryId;
      }
      return true;
    },
    {
      message: 'Category is required for Income and Expense transactions',
      path: ['categoryId'],
    }
  );

export const transferTransactionSchema = z
  .object({
    fromAccountId: z.string().uuid('Invalid source account ID'),
    toAccountId: z.string().uuid('Invalid destination account ID'),
    amount: amountValidation,
    description: z.string().trim().max(1000).optional(),
    transactionDate: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : new Date())),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Source and destination accounts must be distinct',
    path: ['toAccountId'],
  });

export const updateTransactionSchema = z.object({
  amount: amountValidation.optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().trim().max(1000).optional(),
  transactionDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(TransactionType).optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().trim().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransferTransactionInput = z.infer<typeof transferTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionQueryParams = z.infer<typeof transactionQuerySchema>;
