import { apiClient } from './api';
import type { Budget } from './budget.service';
import type { Goal } from './goal.service';

export type AnalyticsPeriod =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'all'
  | 'custom';

export interface CashFlowSummary {
  period: string;
  startDate: string;
  endDate: string;
  totalIncome: string;
  totalExpenses: string;
  netCashFlow: string;
  savingsRate: number;
  transactionCounts: {
    income: number;
    expense: number;
    total: number;
  };
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  icon: string | null;
  color: string | null;
  amount: string;
  transactionCount: number;
  percentage: number;
}

export interface CategoryBreakdownResponse {
  period: string;
  totalExpenses: string;
  breakdown: CategoryBreakdownItem[];
}

export interface MonthlyTrendItem {
  year: number;
  month: number;
  monthLabel: string;
  income: string;
  expense: string;
  netCashFlow: string;
  incomeMoMChangePercent: number | null;
  expenseMoMChangePercent: number | null;
}

export interface AccountBalancesResponse {
  totalActiveAccounts: number;
  currencies: {
    currency: string;
    totalBalance: string;
    accountCount: number;
    accounts: {
      id: string;
      name: string;
      type: string;
      balance: string;
      currency: string;
    }[];
  }[];
}

export interface BudgetSummaryResponse {
  totalBudgets: number;
  totalBudgeted: string;
  totalSpent: string;
  remaining: string;
  overallUtilizationPercent: number;
  onTrackCount: number;
  approachingCount: number;
  exceededCount: number;
  budgets: Budget[];
}

export interface GoalsSummaryResponse {
  totalGoals: number;
  activeCount: number;
  completedCount: number;
  overdueCount: number;
  totalTargetAmount: string;
  totalSavedAmount: string;
  overallProgressPercent: number;
  goals: Goal[];
}

export const analyticsService = {
  getSummary: async (params?: {
    period?: AnalyticsPeriod;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  }): Promise<CashFlowSummary> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const res = await apiClient.get(`/analytics/summary?${query.toString()}`);
    return res.data.data;
  },

  getCategoryBreakdown: async (params?: {
    period?: AnalyticsPeriod;
    startDate?: string;
    endDate?: string;
  }): Promise<CategoryBreakdownResponse> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const res = await apiClient.get(`/analytics/category-breakdown?${query.toString()}`);
    return res.data.data;
  },

  getMonthlyTrends: async (months = 6): Promise<MonthlyTrendItem[]> => {
    const res = await apiClient.get(`/analytics/monthly-trends?months=${months}`);
    return res.data.data;
  },

  getAccountBalances: async (): Promise<AccountBalancesResponse> => {
    const res = await apiClient.get('/analytics/account-balances');
    return res.data.data;
  },

  getBudgetSummary: async (month?: number, year?: number): Promise<BudgetSummaryResponse> => {
    const query = new URLSearchParams();
    if (month) query.append('month', String(month));
    if (year) query.append('year', String(year));
    const res = await apiClient.get(`/analytics/budget-summary?${query.toString()}`);
    return res.data.data;
  },

  getGoalsSummary: async (): Promise<GoalsSummaryResponse> => {
    const res = await apiClient.get('/analytics/goals-summary');
    return res.data.data;
  },
};
