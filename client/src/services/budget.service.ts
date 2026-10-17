import { apiClient } from './api';

export type BudgetStatus = 'ON_TRACK' | 'APPROACHING' | 'EXCEEDED';

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  month: number;
  year: number;
  spent: string;
  remaining: string;
  utilizationPercent: number;
  status: BudgetStatus;
  category: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    isSystem: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export const budgetService = {
  getBudgets: async (params?: { month?: number; year?: number }): Promise<Budget[]> => {
    const query = new URLSearchParams();
    if (params?.month) query.append('month', String(params.month));
    if (params?.year) query.append('year', String(params.year));
    const res = await apiClient.get(`/budgets?${query.toString()}`);
    return res.data.data;
  },

  getBudgetById: async (id: string): Promise<Budget> => {
    const res = await apiClient.get(`/budgets/${id}`);
    return res.data.data;
  },

  createBudget: async (data: {
    categoryId: string;
    amount: number | string;
    month: number;
    year: number;
  }): Promise<Budget> => {
    const res = await apiClient.post('/budgets', data);
    return res.data.data;
  },

  updateBudget: async (id: string, data: { amount: number | string }): Promise<Budget> => {
    const res = await apiClient.put(`/budgets/${id}`, data);
    return res.data.data;
  },

  deleteBudget: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/budgets/${id}`);
    return res.data;
  },
};
