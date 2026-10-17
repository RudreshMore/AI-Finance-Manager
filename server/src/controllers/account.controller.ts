import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/account.service';
import { ApiResponse } from '../utils/ApiResponse';

export class AccountController {
  static async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await AccountService.createAccount(req.user!.id, req.body);
      ApiResponse.created(res, account, 'Account created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = await AccountService.getAccounts(req.user!.id);
      ApiResponse.success(res, accounts, 'Accounts retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getAccountById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await AccountService.getAccountById(req.user!.id, req.params.id as string);
      ApiResponse.success(res, account, 'Account details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await AccountService.updateAccount(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      ApiResponse.success(res, updated, 'Account updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AccountService.deleteAccount(
        req.user!.id,
        req.params.id as string
      );
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async getAccountTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await AccountService.getAccountTransactions(
        req.user!.id,
        req.params.id as string,
        page,
        limit
      );
      ApiResponse.success(res, result, 'Account transactions retrieved');
    } catch (error) {
      next(error);
    }
  }
}
