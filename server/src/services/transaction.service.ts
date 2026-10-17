import { Prisma, TransactionType, CategoryType } from '@prisma/client';
import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryParams,
} from '../validators/transaction.validator';

export class TransactionService {
  /**
   * Creates an INCOME, EXPENSE, or TRANSFER transaction atomically updating balances.
   */
  static async createTransaction(userId: string, input: CreateTransactionInput) {
    const amount = new Prisma.Decimal(input.amount);

    return prisma.$transaction(async (tx) => {
      // 1. Validate Source Account
      const sourceAccount = await tx.account.findFirst({
        where: { id: input.accountId, userId },
      });

      if (!sourceAccount) {
        throw ApiError.notFound('Source account not found or does not belong to you');
      }

      // 2. Handle INCOME
      if (input.type === TransactionType.INCOME) {
        if (!input.categoryId) {
          throw ApiError.badRequest('Category is required for income transactions');
        }

        const category = await tx.category.findFirst({
          where: {
            id: input.categoryId,
            OR: [{ userId }, { isSystem: true }],
          },
        });

        if (!category) {
          throw ApiError.notFound('Category not found');
        }

        if (category.type !== CategoryType.INCOME) {
          throw ApiError.badRequest('Selected category must be an INCOME category');
        }

        // Increment balance
        const updatedSource = await tx.account.update({
          where: { id: sourceAccount.id },
          data: {
            balance: sourceAccount.balance.add(amount),
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            userId,
            accountId: sourceAccount.id,
            categoryId: category.id,
            type: TransactionType.INCOME,
            amount,
            description: input.description,
            transactionDate: input.transactionDate || new Date(),
          },
          include: {
            account: true,
            category: true,
          },
        });

        return { transaction, newBalance: updatedSource.balance };
      }

      // 3. Handle EXPENSE
      if (input.type === TransactionType.EXPENSE) {
        if (!input.categoryId) {
          throw ApiError.badRequest('Category is required for expense transactions');
        }

        const category = await tx.category.findFirst({
          where: {
            id: input.categoryId,
            OR: [{ userId }, { isSystem: true }],
          },
        });

        if (!category) {
          throw ApiError.notFound('Category not found');
        }

        if (category.type !== CategoryType.EXPENSE) {
          throw ApiError.badRequest('Selected category must be an EXPENSE category');
        }

        // Overdraft check for non-credit accounts
        if (
          sourceAccount.type !== 'CREDIT_CARD' &&
          sourceAccount.balance.lessThan(amount)
        ) {
          throw ApiError.badRequest(
            `Insufficient funds in account "${sourceAccount.name}". Current balance: ${sourceAccount.balance}, requested: ${amount}`
          );
        }

        // Decrement balance
        const updatedSource = await tx.account.update({
          where: { id: sourceAccount.id },
          data: {
            balance: sourceAccount.balance.sub(amount),
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            userId,
            accountId: sourceAccount.id,
            categoryId: category.id,
            type: TransactionType.EXPENSE,
            amount,
            description: input.description,
            transactionDate: input.transactionDate || new Date(),
          },
          include: {
            account: true,
            category: true,
          },
        });

        return { transaction, newBalance: updatedSource.balance };
      }

      // 4. Handle TRANSFER
      if (input.type === TransactionType.TRANSFER) {
        if (!input.destinationAccountId) {
          throw ApiError.badRequest('Destination account is required for transfers');
        }

        if (sourceAccount.id === input.destinationAccountId) {
          throw ApiError.badRequest('Source and destination accounts must be distinct');
        }

        const destinationAccount = await tx.account.findFirst({
          where: { id: input.destinationAccountId, userId },
        });

        if (!destinationAccount) {
          throw ApiError.notFound('Destination account not found or does not belong to you');
        }

        // Currency compatibility check
        if (sourceAccount.currency !== destinationAccount.currency) {
          throw ApiError.badRequest(
            `Currency mismatch: source is in ${sourceAccount.currency} while destination is in ${destinationAccount.currency}. Transfers between different currencies require exchange configuration.`
          );
        }

        // Overdraft check for source account
        if (
          sourceAccount.type !== 'CREDIT_CARD' &&
          sourceAccount.balance.lessThan(amount)
        ) {
          throw ApiError.badRequest(
            `Insufficient funds in account "${sourceAccount.name}". Current balance: ${sourceAccount.balance}, requested transfer: ${amount}`
          );
        }

        // Atomically update both accounts
        const [updatedSource, updatedDestination] = await Promise.all([
          tx.account.update({
            where: { id: sourceAccount.id },
            data: { balance: sourceAccount.balance.sub(amount) },
          }),
          tx.account.update({
            where: { id: destinationAccount.id },
            data: { balance: destinationAccount.balance.add(amount) },
          }),
        ]);

        const transaction = await tx.transaction.create({
          data: {
            userId,
            accountId: sourceAccount.id,
            destinationAccountId: destinationAccount.id,
            categoryId: null, // Transfers do not belong to spending categories
            type: TransactionType.TRANSFER,
            amount,
            description: input.description,
            transactionDate: input.transactionDate || new Date(),
          },
          include: {
            account: true,
            destinationAccount: true,
          },
        });

        return {
          transaction,
          sourceBalance: updatedSource.balance,
          destinationBalance: updatedDestination.balance,
        };
      }

      throw ApiError.badRequest('Invalid transaction type');
    });
  }

  /**
   * Retrieves paginated, sorted, and filtered transaction history.
   */
  static async getTransactions(userId: string, query: TransactionQueryParams) {
    const page = typeof query.page === 'string' ? parseInt(query.page, 10) : (query.page || 1);
    const limit = typeof query.limit === 'string' ? parseInt(query.limit, 10) : (query.limit || 20);
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TransactionWhereInput = {
      userId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.accountId
        ? {
            OR: [
              { accountId: query.accountId },
              { destinationAccountId: query.accountId },
            ],
          }
        : {}),
      ...(query.search
        ? {
            description: {
              contains: query.search,
            },
          }
        : {}),
      ...(query.startDate || query.endDate
        ? {
            transactionDate: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          account: true,
          destinationAccount: true,
          category: true,
        },
      }),
      prisma.transaction.count({
        where: whereClause,
      }),
    ]);

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single transaction by ID ensuring user ownership.
   */
  static async getTransactionById(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        account: true,
        destinationAccount: true,
        category: true,
      },
    });

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    return transaction;
  }

  /**
   * Updates an existing transaction, reversing previous balance changes and applying new changes.
   */
  static async updateTransaction(
    userId: string,
    transactionId: string,
    input: UpdateTransactionInput
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id: transactionId, userId },
        include: { account: true, destinationAccount: true },
      });

      if (!existing) {
        throw ApiError.notFound('Transaction not found');
      }

      // If category is changing, validate it
      if (input.categoryId && input.categoryId !== existing.categoryId) {
        const cat = await tx.category.findFirst({
          where: {
            id: input.categoryId,
            OR: [{ userId }, { isSystem: true }],
          },
        });

        if (!cat) {
          throw ApiError.notFound('Category not found');
        }

        if (
          (existing.type === TransactionType.INCOME && cat.type !== CategoryType.INCOME) ||
          (existing.type === TransactionType.EXPENSE && cat.type !== CategoryType.EXPENSE)
        ) {
          throw ApiError.badRequest(`Category type must match transaction type (${existing.type})`);
        }
      }

      const newAmount =
        input.amount !== undefined
          ? new Prisma.Decimal(input.amount)
          : existing.amount;

      // If amount or balance impact has changed, reverse previous balance effect first
      if (!newAmount.equals(existing.amount)) {
        if (existing.type === TransactionType.INCOME) {
          // Revert: subtract old amount, add new amount
          const netDiff = newAmount.sub(existing.amount);
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: existing.account.balance.add(netDiff) },
          });
        } else if (existing.type === TransactionType.EXPENSE) {
          // Revert: add old amount, subtract new amount
          const netDiff = newAmount.sub(existing.amount); // if new is greater, netDiff is positive
          const tentativeBalance = existing.account.balance.sub(netDiff);

          if (
            existing.account.type !== 'CREDIT_CARD' &&
            tentativeBalance.lessThan(0)
          ) {
            throw ApiError.badRequest('Insufficient funds to increase expense amount');
          }

          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: tentativeBalance },
          });
        } else if (existing.type === TransactionType.TRANSFER) {
          const netDiff = newAmount.sub(existing.amount);
          const tentativeSourceBalance = existing.account.balance.sub(netDiff);

          if (
            existing.account.type !== 'CREDIT_CARD' &&
            tentativeSourceBalance.lessThan(0)
          ) {
            throw ApiError.badRequest('Insufficient funds in source account for updated transfer');
          }

          await Promise.all([
            tx.account.update({
              where: { id: existing.accountId },
              data: { balance: tentativeSourceBalance },
            }),
            tx.account.update({
              where: { id: existing.destinationAccountId! },
              data: { balance: existing.destinationAccount!.balance.add(netDiff) },
            }),
          ]);
        }
      }

      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          ...(input.amount !== undefined ? { amount: newAmount } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.transactionDate ? { transactionDate: input.transactionDate } : {}),
        },
        include: {
          account: true,
          destinationAccount: true,
          category: true,
        },
      });

      return updated;
    });
  }

  /**
   * Deletes a transaction and atomically reverses its effect on account balances.
   */
  static async deleteTransaction(userId: string, transactionId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id: transactionId, userId },
        include: { account: true, destinationAccount: true },
      });

      if (!existing) {
        throw ApiError.notFound('Transaction not found');
      }

      // Reverse balance effect
      if (existing.type === TransactionType.INCOME) {
        // Revert: subtract income
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: existing.account.balance.sub(existing.amount) },
        });
      } else if (existing.type === TransactionType.EXPENSE) {
        // Revert: restore spent funds
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: existing.account.balance.add(existing.amount) },
        });
      } else if (existing.type === TransactionType.TRANSFER) {
        // Revert: refund source, debit destination
        await Promise.all([
          tx.account.update({
            where: { id: existing.accountId },
            data: { balance: existing.account.balance.add(existing.amount) },
          }),
          tx.account.update({
            where: { id: existing.destinationAccountId! },
            data: { balance: existing.destinationAccount!.balance.sub(existing.amount) },
          }),
        ]);
      }

      await tx.transaction.delete({
        where: { id: transactionId },
      });

      return { message: 'Transaction deleted and balance successfully restored' };
    });
  }
}
