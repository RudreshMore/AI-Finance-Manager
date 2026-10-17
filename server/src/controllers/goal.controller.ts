import { Request, Response, NextFunction } from 'express';
import { GoalService } from '../services/goal.service';

export class GoalController {
  static async createGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await GoalService.createGoal(req.user!.id, req.body);
      res.status(201).json({
        status: 'success',
        message: 'Savings goal created successfully',
        data: goal,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const goals = await GoalService.getGoals(req.user!.id);
      res.status(200).json({
        status: 'success',
        data: goals,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getGoalById(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await GoalService.getGoalById(req.user!.id, req.params.id as string);
      res.status(200).json({
        status: 'success',
        data: goal,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await GoalService.updateGoal(req.user!.id, req.params.id as string, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Savings goal updated successfully',
        data: goal,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await GoalService.deleteGoal(req.user!.id, req.params.id as string);
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
}
