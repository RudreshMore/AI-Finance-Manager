import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import type { CreateGoalInput, UpdateGoalInput } from '../validators/goal.validator';

export interface GoalResponse {
  id: string;
  userId: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  remainingAmount: string;
  progressPercent: number;
  targetDate: string | null;
  isCompleted: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE';
  monthlySavingsNeeded: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class GoalService {
  /**
   * Helper to enrich goal with progress, status, and required monthly savings.
   */
  private static enrichGoal(goal: any): GoalResponse {
    const targetDecimal = new Prisma.Decimal(goal.targetAmount);
    const currentDecimal = new Prisma.Decimal(goal.currentAmount);

    let remainingDecimal = targetDecimal.minus(currentDecimal);
    if (remainingDecimal.isNegative()) {
      remainingDecimal = new Prisma.Decimal(0);
    }

    const targetNum = targetDecimal.toNumber();
    const currentNum = currentDecimal.toNumber();
    const progressPercent = targetNum > 0 ? Math.min(100, Math.round((currentNum / targetNum) * 10000) / 100) : 0;

    const isCompleted = goal.isCompleted || currentNum >= targetNum;

    const now = new Date();
    let status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' = 'ACTIVE';

    if (isCompleted) {
      status = 'COMPLETED';
    } else if (goal.targetDate && new Date(goal.targetDate).getTime() < now.getTime()) {
      status = 'OVERDUE';
    }

    let monthlySavingsNeeded: string | null = null;
    if (isCompleted) {
      monthlySavingsNeeded = '0.00';
    } else if (goal.targetDate) {
      const targetDate = new Date(goal.targetDate);
      if (targetDate.getTime() < now.getTime()) {
        // Already overdue, entire remaining amount is needed
        monthlySavingsNeeded = remainingDecimal.toFixed(2);
      } else {
        const yearDiff = targetDate.getUTCFullYear() - now.getUTCFullYear();
        const monthDiff = targetDate.getUTCMonth() - now.getUTCMonth();
        const totalMonths = yearDiff * 12 + monthDiff;

        // If target date is in the same month or within 30 days, count as 1 month
        const monthsRemaining = Math.max(1, totalMonths);
        const needed = remainingDecimal.toNumber() / monthsRemaining;
        monthlySavingsNeeded = (Math.round(needed * 100) / 100).toFixed(2);
      }
    }

    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      targetAmount: targetDecimal.toFixed(2),
      currentAmount: currentDecimal.toFixed(2),
      remainingAmount: remainingDecimal.toFixed(2),
      progressPercent,
      targetDate: goal.targetDate ? (new Date(goal.targetDate).toISOString().split('T')[0] ?? null) : null,
      isCompleted,
      status,
      monthlySavingsNeeded,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  /**
   * Create a new savings goal
   */
  static async createGoal(userId: string, data: CreateGoalInput): Promise<GoalResponse> {
    const isCompleted = data.currentAmount !== undefined && data.currentAmount >= data.targetAmount;

    const goal = await prisma.goal.create({
      data: {
        userId,
        name: data.name,
        targetAmount: new Prisma.Decimal(data.targetAmount),
        currentAmount: new Prisma.Decimal(data.currentAmount ?? 0),
        targetDate: data.targetDate,
        isCompleted,
      },
    });

    return this.enrichGoal(goal);
  }

  /**
   * List all goals for the authenticated user
   */
  static async getGoals(userId: string): Promise<GoalResponse[]> {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((g) => this.enrichGoal(g));
  }

  /**
   * Get an individual goal by ID
   */
  static async getGoalById(userId: string, id: string): Promise<GoalResponse> {
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal || goal.userId !== userId) {
      throw new ApiError(404, 'Savings goal not found');
    }

    return this.enrichGoal(goal);
  }

  /**
   * Update goal details (target amount, current saved amount, name, date, completion)
   * Note: Purely isolated from actual bank balances.
   */
  static async updateGoal(userId: string, id: string, data: UpdateGoalInput): Promise<GoalResponse> {
    const existing = await prisma.goal.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, 'Savings goal not found');
    }

    const newTarget = data.targetAmount !== undefined ? new Prisma.Decimal(data.targetAmount) : existing.targetAmount;
    const newCurrent = data.currentAmount !== undefined ? new Prisma.Decimal(data.currentAmount) : existing.currentAmount;

    if (newCurrent.greaterThan(newTarget)) {
      throw new ApiError(400, 'Current savings cannot exceed the target amount');
    }

    const isCompleted = data.isCompleted ?? newCurrent.greaterThanOrEqualTo(newTarget);

    const updated = await prisma.goal.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.targetAmount !== undefined ? { targetAmount: newTarget } : {}),
        ...(data.currentAmount !== undefined ? { currentAmount: newCurrent } : {}),
        ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
        isCompleted,
      },
    });

    return this.enrichGoal(updated);
  }

  /**
   * Delete a savings goal
   */
  static async deleteGoal(userId: string, id: string): Promise<{ message: string }> {
    const existing = await prisma.goal.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, 'Savings goal not found');
    }

    await prisma.goal.delete({
      where: { id },
    });

    return { message: 'Savings goal deleted successfully' };
  }
}
