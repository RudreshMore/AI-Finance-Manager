import { GoogleGenAI, Content, Part } from '@google/genai';
import { env } from '../../config/env';
import { FINANCE_TOOL_DECLARATIONS, executeFinanceTool } from './tools/finance.tools';
import { FINANCIAL_ASSISTANT_SYSTEM_PROMPT } from './prompts/financial-assistant.prompt';
import { AnalyticsService } from '../analytics.service';

export interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  response: string;
  toolsUsed: string[];
  configured: boolean;
}

export interface MonthlySummaryResult {
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

export class AiService {
  private static genAiClient: GoogleGenAI | null = null;

  /**
   * Check whether the Gemini API is configured with a valid API key.
   */
  public static isConfigured(): boolean {
    return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
  }

  /**
   * Returns a singleton instance of the GoogleGenAI client.
   */
  private static getClient(): GoogleGenAI {
    if (!this.genAiClient) {
      if (!this.isConfigured()) {
        throw new Error('GEMINI_API_KEY is not configured in environment variables.');
      }
      this.genAiClient = new GoogleGenAI({
        apiKey: env.GEMINI_API_KEY!,
      });
    }
    return this.genAiClient;
  }

  /**
   * Allows unit tests to override/mock the GoogleGenAI client instance.
   */
  public static setMockClient(mockClient: any) {
    this.genAiClient = mockClient;
  }

  /**
   * Process a conversational turn with multi-turn context and controlled tool calling.
   */
  public static async chat(
    userId: string,
    userMessage: string,
    history: ChatMessageInput[] = []
  ): Promise<ChatResult> {
    // 1. Check if Gemini AI is configured
    if (!this.isConfigured() && !this.genAiClient) {
      return {
        configured: false,
        toolsUsed: [],
        response:
          '### 🤖 AI Financial Assistant Setup\n\n' +
          'The AI Financial Assistant is currently not configured with an API key.\n\n' +
          '**To activate AI insights:**\n' +
          '1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/).\n' +
          '2. Add `GEMINI_API_KEY="your_api_key"` to `server/.env`.\n' +
          '3. Restart the server.\n\n' +
          '*All other features (Accounts, Transactions, Budgets, and Analytics) remain fully operational.*',
      };
    }

    const ai = this.getClient();
    const toolsUsed: string[] = [];

    // 2. Build multi-turn contents array
    const contents: Content[] = [];

    // Map conversation history
    for (const msg of history) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    try {
      // 3. Controlled Tool Calling Loop (maximum 5 turns to prevent infinite execution loops)
      const MAX_TOOL_TURNS = 5;
      let turn = 0;

      while (turn < MAX_TOOL_TURNS) {
        turn++;

        const response = await ai.models.generateContent({
          model: env.GEMINI_MODEL,
          contents,
          config: {
            systemInstruction: FINANCIAL_ASSISTANT_SYSTEM_PROMPT,
            tools: [{ functionDeclarations: FINANCE_TOOL_DECLARATIONS }],
          },
        });

        const functionCalls = response.functionCalls;

        // If no tool call was requested, we have reached the final assistant response
        if (!functionCalls || functionCalls.length === 0) {
          const finalText = response.text || 'I have reviewed your financial information.';
          return {
            configured: true,
            toolsUsed: Array.from(new Set(toolsUsed)),
            response: finalText,
          };
        }

        // Add the model's response parts to conversation history
        const modelParts: Part[] = response.candidates?.[0]?.content?.parts || [];
        contents.push({
          role: 'model',
          parts: modelParts,
        });

        // Execute each requested tool in parallel safely
        const functionResponseParts: Part[] = [];

        for (const call of functionCalls) {
          const toolName = call.name || 'unknownTool';
          toolsUsed.push(toolName);

          let toolOutput: any;
          try {
            toolOutput = await executeFinanceTool(toolName, call.args || {}, userId);
          } catch (toolError: any) {
            toolOutput = {
              error: toolError?.message || 'Error occurred while querying financial records.',
            };
          }

          functionResponseParts.push({
            functionResponse: {
              name: toolName,
              response: {
                output: toolOutput,
              },
            },
          });
        }

        // Push tool responses as a user turn
        contents.push({
          role: 'user',
          parts: functionResponseParts,
        });
      }

      // Fallback if max iterations exceeded
      return {
        configured: true,
        toolsUsed: Array.from(new Set(toolsUsed)),
        response:
          'I completed the financial queries. Here is a summary of your data based on the records checked.',
      };
    } catch (err: any) {
      console.error('Gemini API Error in AiService.chat:', err);

      // Handle common provider issues gracefully
      if (err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        return {
          configured: true,
          toolsUsed,
          response:
            '⚠️ The AI service is currently receiving high traffic or has reached its rate limit. Please try again in a few moments.',
        };
      }

      if (err?.status === 401 || err?.status === 403 || err?.message?.includes('API_KEY_INVALID')) {
        return {
          configured: false,
          toolsUsed,
          response:
            '⚠️ The configured GEMINI_API_KEY appears to be invalid or unauthorized. Please verify your API key in `server/.env`.',
        };
      }

      return {
        configured: true,
        toolsUsed,
        response:
          '⚠️ I encountered an error while processing your financial request. Please try again or rephrase your question.',
      };
    }
  }

  /**
   * Generates a monthly financial summary with key metrics, budget status, and recommendations.
   */
  public static async getMonthlySummary(
    userId: string,
    month?: number,
    year?: number
  ): Promise<MonthlySummaryResult> {
    const now = new Date();
    const targetMonth = month && month >= 1 && month <= 12 ? month : now.getUTCMonth() + 1;
    const targetYear = year && year >= 2000 && year <= 2100 ? year : now.getUTCFullYear();

    const monthDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const monthLabel = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    // 1. Fetch exact financial data directly from backend services
    const [cashFlow, categoryBreakdown, budgetSummary, goalsSummary] = await Promise.all([
      AnalyticsService.getSummary(userId, { period: 'custom', month: targetMonth, year: targetYear }),
      AnalyticsService.getCategoryBreakdown(userId, { period: 'custom', month: targetMonth, year: targetYear }),
      AnalyticsService.getBudgetSummary(userId, targetMonth, targetYear),
      AnalyticsService.getGoalsSummary(userId),
    ]);

    const topCategory = categoryBreakdown.breakdown[0]?.categoryName || null;

    const metrics = {
      totalIncome: cashFlow.totalIncome,
      totalExpenses: cashFlow.totalExpenses,
      netCashFlow: cashFlow.netCashFlow,
      savingsRate: cashFlow.savingsRate,
      budgetUtilizationPercent: budgetSummary.overallUtilizationPercent,
      activeGoalsCount: goalsSummary.activeCount,
      topExpenseCategory: topCategory,
    };

    // Deterministic base recommendations in case AI is unconfigured or returns brief output
    const defaultRecommendations: string[] = [];

    const incomeNum = parseFloat(cashFlow.totalIncome);
    const expenseNum = parseFloat(cashFlow.totalExpenses);
    const netNum = parseFloat(cashFlow.netCashFlow);

    if (incomeNum === 0 && expenseNum === 0) {
      defaultRecommendations.push('Add your recent income and expense transactions to see meaningful insights.');
    } else {
      if (cashFlow.savingsRate >= 20) {
        defaultRecommendations.push(
          `Excellent savings rate of ${cashFlow.savingsRate}%! Consider channeling surplus savings into your active savings goals.`
        );
      } else if (cashFlow.savingsRate > 0) {
        defaultRecommendations.push(
          `Your current savings rate is ${cashFlow.savingsRate}%. Aim for a 20% savings target by trimming non-essential expenses.`
        );
      } else if (expenseNum > incomeNum) {
        defaultRecommendations.push(
          `You spent ₹${Math.abs(netNum).toFixed(2)} more than your income this month. Review your top spending categories to curb deficit spending.`
        );
      }

      if (budgetSummary.exceededCount > 0) {
        defaultRecommendations.push(
          `You have ${budgetSummary.exceededCount} budget(s) that exceeded their limit. Consider reallocating funds or reducing discretionary purchases.`
        );
      } else if (budgetSummary.totalBudgets > 0) {
        defaultRecommendations.push(
          `All your category budgets are currently on track (${budgetSummary.overallUtilizationPercent}% utilized). Keep up the disciplined spending!`
        );
      } else {
        defaultRecommendations.push('Create category budgets for this month to monitor and cap discretionary spending.');
      }

      if (goalsSummary.activeCount > 0) {
        defaultRecommendations.push(
          `You have ${goalsSummary.activeCount} active savings goal(s) (${goalsSummary.overallProgressPercent}% funded). Keep up regular contributions.`
        );
      }
    }

    // 2. If AI is not configured, return deterministic summary
    if (!this.isConfigured() && !this.genAiClient) {
      const topCatInfo = categoryBreakdown.breakdown[0]
        ? `Your highest expenditure category was **${topCategory}** totaling **₹${categoryBreakdown.breakdown[0].amount}** (${categoryBreakdown.breakdown[0].percentage}% of total expenses).\n\n`
        : '';

      const summaryText =
        `### Monthly Overview for ${monthLabel}\n\n` +
        `During ${monthLabel}, your total recorded income was **₹${cashFlow.totalIncome}** and your total expenses were **₹${cashFlow.totalExpenses}**, ` +
        `resulting in a net cash flow of **₹${cashFlow.netCashFlow}** (Savings Rate: **${cashFlow.savingsRate}%**).\n\n` +
        topCatInfo +
        (budgetSummary.totalBudgets > 0
          ? `You have **${budgetSummary.totalBudgets}** active budget(s) with an overall utilization of **${budgetSummary.overallUtilizationPercent}%** (${budgetSummary.exceededCount} exceeded, ${budgetSummary.approachingCount} approaching limit).\n\n`
          : 'No budgets have been defined for this month yet.\n\n') +
        `*Note: Add \`GEMINI_API_KEY\` to your environment to receive deeper generative AI analysis.*`;

      return {
        period: {
          month: targetMonth,
          year: targetYear,
          label: monthLabel,
        },
        metrics,
        summary: summaryText,
        recommendations: defaultRecommendations,
        configured: false,
      };
    }

    // 3. AI is configured: Request LLM to produce personalized analysis grounded in exact numbers
    try {
      const ai = this.getClient();
      const prompt = `
Analyze the following personal financial data for ${monthLabel}:
- Income: ₹${cashFlow.totalIncome}
- Expenses: ₹${cashFlow.totalExpenses}
- Net Cash Flow: ₹${cashFlow.netCashFlow}
- Savings Rate: ${cashFlow.savingsRate}%
- Top Spending Categories: ${categoryBreakdown.breakdown.slice(0, 5).map((c) => `${c.categoryName} (₹${c.amount}, ${c.percentage}%)`).join(', ') || 'None recorded'}
- Budget Utilization: ${budgetSummary.overallUtilizationPercent}% across ${budgetSummary.totalBudgets} budgets (${budgetSummary.exceededCount} exceeded, ${budgetSummary.approachingCount} approaching, ${budgetSummary.onTrackCount} on track)
- Savings Goals: ${goalsSummary.totalGoals} goals, ${goalsSummary.overallProgressPercent}% funded across ₹${goalsSummary.totalSavedAmount} saved of ₹${goalsSummary.totalTargetAmount} target

Provide:
1. A concise, professional Executive Summary in clean markdown (2-3 paragraphs).
2. Exactly 3 to 5 actionable bullet-point recommendations tailored to these real numbers.
Do not hallucinate any figures outside the data provided above.
`.trim();

      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: FINANCIAL_ASSISTANT_SYSTEM_PROMPT,
        },
      });

      const responseText = response.text || '';

      // Extract bullet points as recommendations if present, otherwise use default recommendations
      const extractedRecommendations: string[] = [];
      const lines = responseText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if ((trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) && trimmed.length > 10) {
          extractedRecommendations.push(trimmed.replace(/^[-*]\s+|\d+\.\s+/, ''));
        }
      }

      return {
        period: {
          month: targetMonth,
          year: targetYear,
          label: monthLabel,
        },
        metrics,
        summary: responseText || `Monthly financial analysis generated for ${monthLabel}.`,
        recommendations:
          extractedRecommendations.length >= 2 ? extractedRecommendations.slice(0, 5) : defaultRecommendations,
        configured: true,
      };
    } catch (aiError) {
      console.error('Error generating AI monthly summary:', aiError);
      return {
        period: {
          month: targetMonth,
          year: targetYear,
          label: monthLabel,
        },
        metrics,
        summary:
          `### Monthly Overview for ${monthLabel}\n\n` +
          `Total income was **₹${cashFlow.totalIncome}** and expenses were **₹${cashFlow.totalExpenses}**, ` +
          `leaving a net cash flow of **₹${cashFlow.netCashFlow}** (Savings Rate: **${cashFlow.savingsRate}%**).`,
        recommendations: defaultRecommendations,
        configured: true,
      };
    }
  }
}
