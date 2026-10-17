import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service';
import { ApiResponse } from '../utils/ApiResponse';
import { TransactionType } from '@prisma/client';

export class TransactionController {
  static async createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TransactionService.createTransaction(req.user!.id, req.body);
      ApiResponse.created(res, result, 'Transaction created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fromAccountId, toAccountId, amount, description, transactionDate } = req.body;
      const result = await TransactionService.createTransaction(req.user!.id, {
        type: TransactionType.TRANSFER,
        accountId: fromAccountId,
        destinationAccountId: toAccountId,
        amount,
        description,
        transactionDate,
      });
      ApiResponse.created(res, result, 'Transfer completed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TransactionService.getTransactions(req.user!.id, req.query as any);
      ApiResponse.success(res, result, 'Transactions retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await TransactionService.getTransactionById(
        req.user!.id,
        req.params.id as string
      );
      ApiResponse.success(res, transaction, 'Transaction details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await TransactionService.updateTransaction(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      ApiResponse.success(res, updated, 'Transaction updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TransactionService.deleteTransaction(
        req.user!.id,
        req.params.id as string
      );
      ApiResponse.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }
}
