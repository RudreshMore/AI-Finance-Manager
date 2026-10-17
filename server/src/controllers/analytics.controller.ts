import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

export class AnalyticsController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await AnalyticsService.getSummary(req.user!.id, req.query as any);
      res.status(200).json({
        status: 'success',
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCategoryBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const breakdown = await AnalyticsService.getCategoryBreakdown(req.user!.id, req.query as any);
      res.status(200).json({
        status: 'success',
        data: breakdown,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMonthlyTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const count = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const trends = await AnalyticsService.getMonthlyTrends(req.user!.id, count);
      res.status(200).json({
        status: 'success',
        data: trends,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAccountBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const balances = await AnalyticsService.getAccountBalances(req.user!.id);
      res.status(200).json({
        status: 'success',
        data: balances,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getBudgetSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const budgetSummary = await AnalyticsService.getBudgetSummary(req.user!.id, month, year);
      res.status(200).json({
        status: 'success',
        data: budgetSummary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getGoalsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const goalsSummary = await AnalyticsService.getGoalsSummary(req.user!.id);
      res.status(200).json({
        status: 'success',
        data: goalsSummary,
      });
    } catch (err) {
      next(err);
    }
  }
}
