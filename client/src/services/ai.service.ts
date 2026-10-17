import { apiClient } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  timestamp?: string;
}

export interface ChatResponse {
  response: string;
  toolsUsed: string[];
  configured: boolean;
}

export interface AiStatusResponse {
  configured: boolean;
  model: string;
  provider: string;
}

export interface MonthlySummaryResponse {
  period: {
    month: number;
    year: number;
    label: string;
  };
  metrics: {
    totalIncome: string;
    totalExpenses: string;
    netCashFlow: string;
    savingsRate: number;
    budgetUtilizationPercent: number;
    activeGoalsCount: number;
    topExpenseCategory: string | null;
  };
  summary: string;
  recommendations: string[];
  configured: boolean;
}

export const AiApiService = {
  /**
   * Fetch configuration and model status of the backend AI engine.
   */
  async getStatus(): Promise<AiStatusResponse> {
    const response = await apiClient.get<{ status: string; data: AiStatusResponse }>('/ai/status');
    return response.data.data;
  },

  /**
   * Send a message to the AI Assistant with optional conversation history.
   */
  async sendMessage(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<ChatResponse> {
    const response = await apiClient.post<{ status: string; data: ChatResponse }>('/ai/chat', {
      message,
      history,
    });
    return response.data.data;
  },

  /**
   * Fetch a grounded monthly financial summary with AI insights and recommendations.
   */
  async getMonthlySummary(month?: number, year?: number): Promise<MonthlySummaryResponse> {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());

    const response = await apiClient.get<{ status: string; data: MonthlySummaryResponse }>(
      `/ai/monthly-summary?${params.toString()}`
    );
    return response.data.data;
  },
};

