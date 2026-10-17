import { FunctionDeclaration, Type } from '@google/genai';
import { AnalyticsService } from '../../analytics.service';
import { TransactionService } from '../../transaction.service';
import { TransactionType } from '@prisma/client';

/**
 * Sanitizes untrusted user strings (like transaction notes) to protect against prompt injection.
 */
function sanitizeUserInput(text: string | null | undefined, maxLength = 150): string {
  if (!text) return '';
  return text
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[<>{}[\]]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Controlled, Read-Only Tool Declarations for Google Gemini LLM.
 * NOTE: The LLM NEVER receives a `userId` parameter. User identity is derived
 * exclusively from the authenticated server session to prevent privilege escalation.
 */
export const FINANCE_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'getFinancialSummary',
    description:
      'Retrieve cash flow summary metrics including total income, total expenses, net cash flow/savings, savings rate percentage, and transaction counts for a given period.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description:
            'Relative time period: this_month, last_month, last_3_months, last_6_months, this_year, or all. Defaults to this_month.',
        },
        startDate: {
          type: Type.STRING,
          description: 'Optional ISO date string or YYYY-MM-DD for custom period.',
        },
        endDate: {
          type: Type.STRING,
          description: 'Optional ISO date string or YYYY-MM-DD for custom period.',
        },
      },
    },
  },
  {
    name: 'getCategorySpending',
    description:
      'Retrieve category-wise expense breakdown with total amount spent per category, percentage of overall spending, and transaction counts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description:
            'Relative time period: this_month, last_month, last_3_months, last_6_months, this_year, or all.',
        },
        month: {
          type: Type.INTEGER,
          description: 'Optional month (1-12) to inspect a specific calendar month.',
        },
        year: {
          type: Type.INTEGER,
          description: 'Optional year (e.g., 2026) to inspect a specific calendar year.',
        },
      },
    },
  },
  {
    name: 'compareMonthlySpending',
    description:
      'Compare income, expenses, net savings, and category spending shifts between two specific calendar months.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        monthA: {
          type: Type.INTEGER,
          description: 'First month number (1-12).',
        },
        yearA: {
          type: Type.INTEGER,
          description: 'First year number (e.g. 2026).',
        },
        monthB: {
          type: Type.INTEGER,
          description: 'Second month number (1-12).',
        },
        yearB: {
          type: Type.INTEGER,
          description: 'Second year number (e.g. 2026).',
        },
      },
      required: ['monthA', 'yearA', 'monthB', 'yearB'],
    },
  },
  {
    name: 'getAccountBalances',
    description:
      'Retrieve all active financial accounts (bank, cash, wallet, credit card, savings), individual balances, and aggregated totals grouped by currency.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getBudgetStatus',
    description:
      'Retrieve monthly budget limits, actual spending, remaining amounts, utilization percentages, and status alerts (ON_TRACK, APPROACHING, EXCEEDED) for the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        month: {
          type: Type.INTEGER,
          description: 'Optional calendar month (1-12). Defaults to current month.',
        },
        year: {
          type: Type.INTEGER,
          description: 'Optional calendar year (e.g., 2026). Defaults to current year.',
        },
      },
    },
  },
  {
    name: 'getSavingsGoals',
    description:
      'Retrieve all savings goals, target amounts, current saved amounts, remaining balances to save, target deadlines, and progress percentages.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getRecentTransactions',
    description:
      'Retrieve recent financial transactions with date, category, account, type, amount, and sanitized notes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.INTEGER,
          description: 'Number of transactions to return (max 30, defaults to 10).',
        },
        type: {
          type: Type.STRING,
          description: 'Filter by transaction type: INCOME, EXPENSE, or TRANSFER.',
        },
        categoryId: {
          type: Type.STRING,
          description: 'Optional category ID filter.',
        },
      },
    },
  },
];

/**
 * Controlled Tool Execution Dispatcher.
 * Executes read-only queries against existing backend services with the authenticated userId.
 */
export async function executeFinanceTool(
  toolName: string,
  args: Record<string, any> = {},
  userId: string
): Promise<any> {
  switch (toolName) {
    case 'getFinancialSummary': {
      const summary = await AnalyticsService.getSummary(userId, {
        period: args.period || 'this_month',
        startDate: args.startDate,
        endDate: args.endDate,
      });
      return summary;
    }

    case 'getCategorySpending': {
      const breakdown = await AnalyticsService.getCategoryBreakdown(userId, {
        period: args.period || 'this_month',
        month: args.month ? Number(args.month) : undefined,
        year: args.year ? Number(args.year) : undefined,
      });
      return breakdown;
    }

    case 'compareMonthlySpending': {
      const monthA = Number(args.monthA);
      const yearA = Number(args.yearA);
      const monthB = Number(args.monthB);
      const yearB = Number(args.yearB);

      const [summaryA, summaryB, breakdownA, breakdownB] = await Promise.all([
        AnalyticsService.getSummary(userId, { period: 'custom', month: monthA, year: yearA }),
        AnalyticsService.getSummary(userId, { period: 'custom', month: monthB, year: yearB }),
        AnalyticsService.getCategoryBreakdown(userId, { period: 'custom', month: monthA, year: yearA }),
        AnalyticsService.getCategoryBreakdown(userId, { period: 'custom', month: monthB, year: yearB }),
      ]);

      const expenseA = parseFloat(summaryA.totalExpenses);
      const expenseB = parseFloat(summaryB.totalExpenses);

      const expenseChange = Math.round((expenseB - expenseA) * 100) / 100;
      const expenseChangePercent =
        expenseA > 0 ? Math.round(((expenseB - expenseA) / expenseA) * 10000) / 100 : null;

      return {
        periodA: {
          month: monthA,
          year: yearA,
          income: summaryA.totalIncome,
          expenses: summaryA.totalExpenses,
          netCashFlow: summaryA.netCashFlow,
          topCategories: breakdownA.breakdown.slice(0, 5),
        },
        periodB: {
          month: monthB,
          year: yearB,
          income: summaryB.totalIncome,
          expenses: summaryB.totalExpenses,
          netCashFlow: summaryB.netCashFlow,
          topCategories: breakdownB.breakdown.slice(0, 5),
        },
        comparison: {
          expenseDifference: expenseChange.toFixed(2),
          expenseChangePercent,
          savingsRateA: summaryA.savingsRate,
          savingsRateB: summaryB.savingsRate,
        },
      };
    }

    case 'getAccountBalances': {
      const balances = await AnalyticsService.getAccountBalances(userId);
      return balances;
    }

    case 'getBudgetStatus': {
      const month = args.month ? Number(args.month) : undefined;
      const year = args.year ? Number(args.year) : undefined;
      const budgetSummary = await AnalyticsService.getBudgetSummary(userId, month, year);
      return budgetSummary;
    }

    case 'getSavingsGoals': {
      const goalsSummary = await AnalyticsService.getGoalsSummary(userId);
      return goalsSummary;
    }

    case 'getRecentTransactions': {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 30);
      let type: TransactionType | undefined = undefined;
      if (args.type && ['INCOME', 'EXPENSE', 'TRANSFER'].includes(args.type)) {
        type = args.type as TransactionType;
      }

      const txResult = await TransactionService.getTransactions(userId, {
        limit,
        page: 1,
        type,
        categoryId: args.categoryId,
      });

      // Sanitize transactions output before feeding back to the model
      const sanitizedTransactions = txResult.transactions.map((tx: any) => ({
        id: tx.id,
        date: tx.transactionDate,
        type: tx.type,
        amount: tx.amount,
        accountName: tx.account?.name || 'Unknown Account',
        destinationAccountName: tx.destinationAccount?.name || null,
        categoryName: tx.category?.name || 'Uncategorized',
        description: sanitizeUserInput(tx.description),
      }));

      return {
        totalFound: txResult.pagination.total,
        returnedCount: sanitizedTransactions.length,
        transactions: sanitizedTransactions,
      };
    }

    default:
      throw new Error(`Tool "${toolName}" is not recognized or not permitted.`);
  }
}
