import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../config/db';
import { BudgetService } from './budget.service';
import { GoalService } from './goal.service';
import type { AnalyticsQueryParams } from '../validators/analytics.validator';

export class AnalyticsService {
  /**
   * Helper to resolve start and end UTC dates for requested period.
   */
  public static resolveDateRange(query: AnalyticsQueryParams): {
    startDate: Date;
    endDate: Date;
    periodLabel: string;
  } {
    const now = new Date();

    // If explicit month and year are provided
    if (query.month && query.year) {
      const startDate = new Date(Date.UTC(query.year, query.month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(query.year, query.month, 1, 0, 0, 0, 0));
      return {
        startDate,
        endDate,
        periodLabel: `${query.month}/${query.year}`,
      };
    }

    if (query.period === 'custom' && query.startDate && query.endDate) {
      return {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        periodLabel: `${query.startDate} to ${query.endDate}`,
      };
    }

    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth(); // 0-indexed

    switch (query.period) {
      case 'last_month': {
        const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
        return { startDate, endDate, periodLabel: 'Last Month' };
      }
      case 'last_3_months': {
        const startDate = new Date(Date.UTC(currentYear, currentMonth - 2, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0, 0));
        return { startDate, endDate, periodLabel: 'Last 3 Months' };
      }
      case 'last_6_months': {
        const startDate = new Date(Date.UTC(currentYear, currentMonth - 5, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0, 0));
        return { startDate, endDate, periodLabel: 'Last 6 Months' };
      }
      case 'this_year': {
        const startDate = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(currentYear + 1, 0, 1, 0, 0, 0, 0));
        return { startDate, endDate, periodLabel: 'This Year' };
      }
      case 'all': {
        const startDate = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(2100, 0, 1, 0, 0, 0, 0));
        return { startDate, endDate, periodLabel: 'All Time' };
      }
      case 'this_month':
      default: {
        const startDate = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0, 0));
        return { startDate, endDate, periodLabel: 'This Month' };
      }
    }
  }

  /**
   * Cash Flow Summary (Income, Expense, Net Flow, Savings Rate)
   */
  static async getSummary(userId: string, query: AnalyticsQueryParams) {
    const { startDate, endDate, periodLabel } = this.resolveDateRange(query);

    // Group sums strictly by transaction type (excluding TRANSFER)
    const [incomeAggregate, expenseAggregate] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.INCOME,
          transactionDate: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          transactionDate: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalIncomeDecimal = incomeAggregate._sum.amount
      ? new Prisma.Decimal(incomeAggregate._sum.amount)
      : new Prisma.Decimal(0);

    const totalExpenseDecimal = expenseAggregate._sum.amount
      ? new Prisma.Decimal(expenseAggregate._sum.amount)
      : new Prisma.Decimal(0);

    const netCashFlowDecimal = totalIncomeDecimal.minus(totalExpenseDecimal);

    const incomeNum = totalIncomeDecimal.toNumber();
    const netFlowNum = netCashFlowDecimal.toNumber();

    // Savings rate calculation with safe division
    let savingsRate = 0;
    if (incomeNum > 0) {
      savingsRate = Math.round((Math.max(0, netFlowNum) / incomeNum) * 10000) / 100;
    }

    return {
      period: periodLabel,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalIncome: totalIncomeDecimal.toFixed(2),
      totalExpenses: totalExpenseDecimal.toFixed(2),
      netCashFlow: netCashFlowDecimal.toFixed(2),
      savingsRate,
      transactionCounts: {
        income: incomeAggregate._count.id,
        expense: expenseAggregate._count.id,
        total: incomeAggregate._count.id + expenseAggregate._count.id,
      },
    };
  }

  /**
   * Spending Category Breakdown
   */
  static async getCategoryBreakdown(userId: string, query: AnalyticsQueryParams) {
    const { startDate, endDate, periodLabel } = this.resolveDateRange(query);

    // Group expense transactions by category
    const grouped = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        categoryId: { not: null },
        transactionDate: { gte: startDate, lt: endDate },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Compute total expense across all categories in period
    const totalSpentDecimal = grouped.reduce(
      (sum, item) => (item._sum.amount ? sum.plus(item._sum.amount) : sum),
      new Prisma.Decimal(0)
    );
    const totalSpentNum = totalSpentDecimal.toNumber();

    // Fetch category metadata
    const categoryIds = grouped.map((g) => g.categoryId!).filter(Boolean);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const breakdown = grouped
      .map((item) => {
        const cat = categoryMap.get(item.categoryId!) || {
          id: item.categoryId!,
          name: 'Unknown Category',
          icon: null,
          color: null,
        };

        const amountDecimal = item._sum.amount
          ? new Prisma.Decimal(item._sum.amount)
          : new Prisma.Decimal(0);
        const amountNum = amountDecimal.toNumber();

        const percentage =
          totalSpentNum > 0 ? Math.round((amountNum / totalSpentNum) * 10000) / 100 : 0;

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          icon: cat.icon,
          color: cat.color,
          amount: amountDecimal.toFixed(2),
          transactionCount: item._count.id,
          percentage,
        };
      })
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    return {
      period: periodLabel,
      totalExpenses: totalSpentDecimal.toFixed(2),
      breakdown,
    };
  }

  /**
   * Monthly Trends & Month-over-Month (MoM) Analytics
   */
  static async getMonthlyTrends(userId: string, monthsCount = 6) {
    const count = Math.min(Math.max(monthsCount, 2), 24);
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();

    const monthsData: {
      year: number;
      month: number;
      monthLabel: string;
      startDate: Date;
      endDate: Date;
    }[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(Date.UTC(currentYear, currentMonth - i, 1));
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

      const monthLabel = date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      monthsData.push({ year, month, monthLabel, startDate, endDate });
    }

    // Query income and expenses for each month
    const results = await Promise.all(
      monthsData.map(async (m) => {
        const [inc, exp] = await Promise.all([
          prisma.transaction.aggregate({
            where: {
              userId,
              type: TransactionType.INCOME,
              transactionDate: { gte: m.startDate, lt: m.endDate },
            },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: {
              userId,
              type: TransactionType.EXPENSE,
              transactionDate: { gte: m.startDate, lt: m.endDate },
            },
            _sum: { amount: true },
          }),
        ]);

        const income = inc._sum.amount ? new Prisma.Decimal(inc._sum.amount) : new Prisma.Decimal(0);
        const expense = exp._sum.amount ? new Prisma.Decimal(exp._sum.amount) : new Prisma.Decimal(0);
        const netCashFlow = income.minus(expense);

        return {
          year: m.year,
          month: m.month,
          monthLabel: m.monthLabel,
          income: income.toFixed(2),
          expense: expense.toFixed(2),
          netCashFlow: netCashFlow.toFixed(2),
          rawIncome: income.toNumber(),
          rawExpense: expense.toNumber(),
          rawNet: netCashFlow.toNumber(),
        };
      })
    );

    // Compute Month-over-Month changes safely
    const trendsWithMoM = results.map((curr, idx) => {
      let incomeMoMChangePercent: number | null = null;
      let expenseMoMChangePercent: number | null = null;

      if (idx > 0) {
        const prev = results[idx - 1];
        if (prev) {
          // Safe division for Income MoM
          if (prev.rawIncome > 0) {
            incomeMoMChangePercent =
              Math.round(((curr.rawIncome - prev.rawIncome) / prev.rawIncome) * 10000) / 100;
          } else if (prev.rawIncome === 0 && curr.rawIncome > 0) {
            incomeMoMChangePercent = 100;
          } else if (prev.rawIncome === 0 && curr.rawIncome === 0) {
            incomeMoMChangePercent = 0;
          }

          // Safe division for Expense MoM
          if (prev.rawExpense > 0) {
            expenseMoMChangePercent =
              Math.round(((curr.rawExpense - prev.rawExpense) / prev.rawExpense) * 10000) / 100;
          } else if (prev.rawExpense === 0 && curr.rawExpense > 0) {
            expenseMoMChangePercent = 100;
          } else if (prev.rawExpense === 0 && curr.rawExpense === 0) {
            expenseMoMChangePercent = 0;
          }
        }
      }

      return {
        year: curr.year,
        month: curr.month,
        monthLabel: curr.monthLabel,
        income: curr.income,
        expense: curr.expense,
        netCashFlow: curr.netCashFlow,
        incomeMoMChangePercent,
        expenseMoMChangePercent,
      };
    });

    return trendsWithMoM;
  }

  /**
   * Account Balances Breakdown grouped by Currency
   */
  static async getAccountBalances(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    });

    // Group accounts strictly by currency to prevent cross-currency summing
    const currencyMap = new Map<string, { totalBalance: Prisma.Decimal; accounts: any[] }>();

    for (const acc of accounts) {
      const cur = acc.currency || 'INR';
      const bal = new Prisma.Decimal(acc.balance);

      if (!currencyMap.has(cur)) {
        currencyMap.set(cur, { totalBalance: new Prisma.Decimal(0), accounts: [] });
      }

      const entry = currencyMap.get(cur)!;
      entry.totalBalance = entry.totalBalance.plus(bal);
      entry.accounts.push({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: bal.toFixed(2),
        currency: cur,
      });
    }

    const summaries = Array.from(currencyMap.entries()).map(([currency, data]) => ({
      currency,
      totalBalance: data.totalBalance.toFixed(2),
      accountCount: data.accounts.length,
      accounts: data.accounts,
    }));

    return {
      totalActiveAccounts: accounts.length,
      currencies: summaries,
    };
  }

  /**
   * Budget Utilization Summary
   */
  static async getBudgetSummary(userId: string, month?: number, year?: number) {
    const budgets = await BudgetService.getBudgets(userId, { month, year });

    let totalBudgetedDecimal = new Prisma.Decimal(0);
    let totalSpentDecimal = new Prisma.Decimal(0);

    let onTrackCount = 0;
    let approachingCount = 0;
    let exceededCount = 0;

    for (const b of budgets) {
      totalBudgetedDecimal = totalBudgetedDecimal.plus(b.amount);
      totalSpentDecimal = totalSpentDecimal.plus(b.spent);

      if (b.status === 'EXCEEDED') exceededCount++;
      else if (b.status === 'APPROACHING') approachingCount++;
      else onTrackCount++;
    }

    const remainingDecimal = totalBudgetedDecimal.minus(totalSpentDecimal);
    const budgetedNum = totalBudgetedDecimal.toNumber();
    const spentNum = totalSpentDecimal.toNumber();

    const overallUtilizationPercent =
      budgetedNum > 0 ? Math.round((spentNum / budgetedNum) * 10000) / 100 : 0;

    return {
      totalBudgets: budgets.length,
      totalBudgeted: totalBudgetedDecimal.toFixed(2),
      totalSpent: totalSpentDecimal.toFixed(2),
      remaining: remainingDecimal.toFixed(2),
      overallUtilizationPercent,
      onTrackCount,
      approachingCount,
      exceededCount,
      budgets,
    };
  }

  /**
   * Savings Goals Progress Summary
   */
  static async getGoalsSummary(userId: string) {
    const goals = await GoalService.getGoals(userId);

    let totalTargetDecimal = new Prisma.Decimal(0);
    let totalSavedDecimal = new Prisma.Decimal(0);

    let activeCount = 0;
    let completedCount = 0;
    let overdueCount = 0;

    for (const g of goals) {
      totalTargetDecimal = totalTargetDecimal.plus(g.targetAmount);
      totalSavedDecimal = totalSavedDecimal.plus(g.currentAmount);

      if (g.status === 'COMPLETED') completedCount++;
      else if (g.status === 'OVERDUE') overdueCount++;
      else activeCount++;
    }

    const targetNum = totalTargetDecimal.toNumber();
    const savedNum = totalSavedDecimal.toNumber();

    const overallProgressPercent =
      targetNum > 0 ? Math.min(100, Math.round((savedNum / targetNum) * 10000) / 100) : 0;

    return {
      totalGoals: goals.length,
      activeCount,
      completedCount,
      overdueCount,
      totalTargetAmount: totalTargetDecimal.toFixed(2),
      totalSavedAmount: totalSavedDecimal.toFixed(2),
      overallProgressPercent,
      goals,
    };
  }
}
