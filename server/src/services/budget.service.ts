import { Prisma, CategoryType } from '@prisma/client';
import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import type { CreateBudgetInput, UpdateBudgetInput, BudgetQueryParams } from '../validators/budget.validator';

export interface BudgetWithSpending {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  month: number;
  year: number;
  spent: string;
  remaining: string;
  utilizationPercent: number;
  status: 'ON_TRACK' | 'APPROACHING' | 'EXCEEDED';
  category: {
    id: string;
    name: string;
    type: CategoryType;
    isSystem: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class BudgetService {
  /**
   * Helper to compute actual spending and status for a budget.
   */
  private static async enrichBudgetWithSpending(
    budget: any,
    userId: string
  ): Promise<BudgetWithSpending> {
    const startOfMonth = new Date(Date.UTC(budget.year, budget.month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(budget.year, budget.month, 1, 0, 0, 0, 0));

    // Exclude income and transfers; strictly query user's expense transactions for this category in the month
    const expenseAggregate = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        transactionDate: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const budgetAmount = new Prisma.Decimal(budget.amount);
    const spentAmount = expenseAggregate._sum.amount
      ? new Prisma.Decimal(expenseAggregate._sum.amount)
      : new Prisma.Decimal(0);

    const remainingDecimal = budgetAmount.minus(spentAmount);
    const remaining = remainingDecimal.toFixed(2);

    const spentNum = spentAmount.toNumber();
    const budgetNum = budgetAmount.toNumber();
    const utilizationPercent = budgetNum > 0 ? Math.round((spentNum / budgetNum) * 10000) / 100 : 0;

    let status: 'ON_TRACK' | 'APPROACHING' | 'EXCEEDED' = 'ON_TRACK';
    if (spentNum > budgetNum) {
      status = 'EXCEEDED';
    } else if (utilizationPercent >= 80) {
      status = 'APPROACHING';
    }

    return {
      id: budget.id,
      userId: budget.userId,
      categoryId: budget.categoryId,
      amount: budgetAmount.toFixed(2),
      month: budget.month,
      year: budget.year,
      spent: spentAmount.toFixed(2),
      remaining,
      utilizationPercent,
      status,
      category: budget.category,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }

  /**
   * Create a new monthly category budget
   */
  static async createBudget(userId: string, data: CreateBudgetInput): Promise<BudgetWithSpending> {
    // 1. Verify category exists, is owned or system, and is EXPENSE
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    if (category.userId && category.userId !== userId) {
      throw new ApiError(403, 'Unauthorized access to category');
    }

    if (category.type !== CategoryType.EXPENSE) {
      throw new ApiError(400, 'Budgets can only be set for EXPENSE categories');
    }

    // 2. Prevent duplicate budgets for same user, category, month, and year
    const existing = await prisma.budget.findUnique({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId: data.categoryId,
          month: data.month,
          year: data.year,
        },
      },
    });

    if (existing) {
      throw new ApiError(409, `A budget already exists for category "${category.name}" in ${data.month}/${data.year}`);
    }

    // 3. Create budget
    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: data.categoryId,
        amount: new Prisma.Decimal(data.amount),
        month: data.month,
        year: data.year,
      },
      include: {
        category: true,
      },
    });

    return this.enrichBudgetWithSpending(budget, userId);
  }

  /**
   * List budgets for user, optionally filtered by month and year.
   * If month and year are not specified, defaults to current month and year.
   */
  static async getBudgets(userId: string, query: BudgetQueryParams): Promise<BudgetWithSpending[]> {
    const now = new Date();
    const month = query.month ?? now.getUTCMonth() + 1;
    const year = query.year ?? now.getUTCFullYear();

    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        month,
        year,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return Promise.all(budgets.map((b) => this.enrichBudgetWithSpending(b, userId)));
  }

  /**
   * Get an individual budget by ID
   */
  static async getBudgetById(userId: string, id: string): Promise<BudgetWithSpending> {
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!budget || budget.userId !== userId) {
      throw new ApiError(404, 'Budget not found');
    }

    return this.enrichBudgetWithSpending(budget, userId);
  }

  /**
   * Update budget amount
   */
  static async updateBudget(userId: string, id: string, data: UpdateBudgetInput): Promise<BudgetWithSpending> {
    const existing = await prisma.budget.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, 'Budget not found');
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: {
        amount: new Prisma.Decimal(data.amount),
      },
      include: {
        category: true,
      },
    });

    return this.enrichBudgetWithSpending(updated, userId);
  }

  /**
   * Delete a budget
   */
  static async deleteBudget(userId: string, id: string): Promise<{ message: string }> {
    const existing = await prisma.budget.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, 'Budget not found');
    }

    await prisma.budget.delete({
      where: { id },
    });

    return { message: 'Budget deleted successfully' };
  }
}
