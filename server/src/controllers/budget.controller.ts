import { Request, Response, NextFunction } from 'express';
import { BudgetService } from '../services/budget.service';

export class BudgetController {
  static async createBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const budget = await BudgetService.createBudget(req.user!.id, req.body);
      res.status(201).json({
        status: 'success',
        message: 'Budget created successfully',
        data: budget,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getBudgets(req: Request, res: Response, next: NextFunction) {
    try {
      const budgets = await BudgetService.getBudgets(req.user!.id, req.query as any);
      res.status(200).json({
        status: 'success',
        data: budgets,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getBudgetById(req: Request, res: Response, next: NextFunction) {
    try {
      const budget = await BudgetService.getBudgetById(req.user!.id, req.params.id as string);
      res.status(200).json({
        status: 'success',
        data: budget,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const budget = await BudgetService.updateBudget(req.user!.id, req.params.id as string, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Budget updated successfully',
        data: budget,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await BudgetService.deleteBudget(req.user!.id, req.params.id as string);
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
}
