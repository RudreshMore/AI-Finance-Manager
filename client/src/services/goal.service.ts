import { apiClient } from './api';

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'OVERDUE';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  remainingAmount: string;
  progressPercent: number;
  targetDate: string | null;
  isCompleted: boolean;
  status: GoalStatus;
  monthlySavingsNeeded: string | null;
  createdAt: string;
  updatedAt: string;
}

export const goalService = {
  getGoals: async (): Promise<Goal[]> => {
    const res = await apiClient.get('/goals');
    return res.data.data;
  },

  getGoalById: async (id: string): Promise<Goal> => {
    const res = await apiClient.get(`/goals/${id}`);
    return res.data.data;
  },

  createGoal: async (data: {
    name: string;
    targetAmount: number | string;
    currentAmount?: number | string;
    targetDate?: string | null;
  }): Promise<Goal> => {
    const res = await apiClient.post('/goals', data);
    return res.data.data;
  },

  updateGoal: async (
    id: string,
    data: {
      name?: string;
      targetAmount?: number | string;
      currentAmount?: number | string;
      targetDate?: string | null;
      isCompleted?: boolean;
    }
  ): Promise<Goal> => {
    const res = await apiClient.put(`/goals/${id}`, data);
    return res.data.data;
  },

  deleteGoal: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/goals/${id}`);
    return res.data;
  },
};
