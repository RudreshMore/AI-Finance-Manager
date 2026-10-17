import { z } from 'zod';
import { CategoryType } from '@prisma/client';

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(100, 'Category name cannot exceed 100 characters'),
  type: z.nativeEnum(CategoryType),
  icon: z.string().trim().max(50).optional(),
  color: z.string().trim().max(30).optional(),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(100, 'Category name cannot exceed 100 characters')
    .optional(),
  icon: z.string().trim().max(50).optional(),
  color: z.string().trim().max(30).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
