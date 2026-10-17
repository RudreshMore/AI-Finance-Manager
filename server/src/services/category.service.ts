import { CategoryType } from '@prisma/client';
import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator';

export class CategoryService {
  static async getCategories(userId: string, type?: CategoryType) {
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ isSystem: true }, { userId }],
        ...(type ? { type } : {}),
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return categories;
  }

  static async getCategoryById(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ isSystem: true }, { userId }],
      },
    });

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    return category;
  }

  static async createCategory(userId: string, input: CreateCategoryInput) {
    // Check if a category with this name and type already exists (either as system or user-owned)
    const existing = await prisma.category.findFirst({
      where: {
        name: input.name,
        type: input.type,
        OR: [{ isSystem: true }, { userId }],
      },
    });

    if (existing) {
      throw ApiError.conflict(
        `A ${input.type.toLowerCase()} category named "${input.name}" already exists`
      );
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        icon: input.icon || 'Tag',
        color: input.color || '#10b981',
        isSystem: false,
      },
    });

    return category;
  }

  static async updateCategory(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    if (category.isSystem) {
      throw ApiError.forbidden('Default system categories cannot be modified');
    }

    if (category.userId !== userId) {
      throw ApiError.forbidden('You are not authorized to modify this category');
    }

    if (input.name && input.name !== category.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          name: input.name,
          type: category.type,
          OR: [{ isSystem: true }, { userId }],
        },
      });

      if (duplicate) {
        throw ApiError.conflict(
          `A ${category.type.toLowerCase()} category named "${input.name}" already exists`
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.icon ? { icon: input.icon } : {}),
        ...(input.color ? { color: input.color } : {}),
      },
    });

    return updated;
  }

  static async deleteCategory(userId: string, categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    if (category.isSystem) {
      throw ApiError.forbidden('Default system categories cannot be deleted');
    }

    if (category.userId !== userId) {
      throw ApiError.forbidden('You are not authorized to delete this category');
    }

    // Safe deletion: Check if any transactions reference this category
    const txCount = await prisma.transaction.count({
      where: { categoryId },
    });

    if (txCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete category "${category.name}" because it is referenced by ${txCount} transaction(s). Reassign transactions first.`
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: `Category "${category.name}" deleted successfully` };
  }
}
