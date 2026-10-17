import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai/ai.service';
import { chatInputSchema, monthlySummaryQuerySchema } from '../validators/ai.validator';
import { env } from '../config/env';

export class AiController {
  /**
   * POST /api/ai/chat
   * Interactive conversational financial assistant with grounded tool execution.
   */
  static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const input = chatInputSchema.parse(req.body);
      const userId = req.user!.id;

      const result = await AiService.chat(userId, input.message, input.history);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/ai/monthly-summary
   * Generates or retrieves a grounded monthly financial summary with AI recommendations.
   */
  static async getMonthlySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const query = monthlySummaryQuerySchema.parse(req.query);
      const userId = req.user!.id;

      const summary = await AiService.getMonthlySummary(userId, query.month, query.year);

      res.status(200).json({
        status: 'success',
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/ai/status
   * Checks whether the AI engine is configured with an active API key and model.
   */
  static async getStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        status: 'success',
        data: {
          configured: AiService.isConfigured(),
          model: env.GEMINI_MODEL,
          provider: 'Google Gemini',
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
