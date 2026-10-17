import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { CreateAccountInput, UpdateAccountInput } from '../validators/account.validator';

export class AccountService {
  static async createAccount(userId: string, input: CreateAccountInput) {
    const existing = await prisma.account.findUnique({
      where: {
        userId_name: {
          userId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict(`An account named "${input.name}" already exists`);
    }

    const initialBalanceDecimal = new Prisma.Decimal(input.initialBalance);

    if (initialBalanceDecimal.lessThan(0) && input.type !== 'CREDIT_CARD') {
      throw ApiError.badRequest('Initial balance cannot be negative for non-credit accounts');
    }

    const account = await prisma.account.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        balance: initialBalanceDecimal,
        currency: input.currency,
      },
    });

    return account;
  }

  static async getAccounts(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            transactions: true,
            destinationTransactions: true,
          },
        },
      },
    });

    return accounts.map((acc) => ({
      ...acc,
      transactionCount: acc._count.transactions + acc._count.destinationTransactions,
    }));
  }

  static async getAccountById(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      include: {
        _count: {
          select: {
            transactions: true,
            destinationTransactions: true,
          },
        },
      },
    });

    if (!account) {
      throw ApiError.notFound('Account not found');
    }

    return {
      ...account,
      transactionCount: account._count.transactions + account._count.destinationTransactions,
    };
  }

  static async updateAccount(userId: string, accountId: string, input: UpdateAccountInput) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw ApiError.notFound('Account not found');
    }

    if (input.name && input.name !== account.name) {
      const duplicate = await prisma.account.findUnique({
        where: {
          userId_name: {
            userId,
            name: input.name,
          },
        },
      });

      if (duplicate) {
        throw ApiError.conflict(`An account named "${input.name}" already exists`);
      }
    }

    const updated = await prisma.account.update({
      where: { id: accountId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      },
    });

    return updated;
  }

  static async deleteAccount(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw ApiError.notFound('Account not found');
    }

    // Safe deletion rule: Never delete an account with transactions
    const txCount = await prisma.transaction.count({
      where: {
        OR: [{ accountId }, { destinationAccountId: accountId }],
      },
    });

    if (txCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete account "${account.name}" because it contains ${txCount} transaction record(s). Archive the account instead to protect financial history.`
      );
    }

    await prisma.account.delete({
      where: { id: accountId },
    });

    return { message: `Account "${account.name}" deleted successfully` };
  }

  static async getAccountTransactions(
    userId: string,
    accountId: string,
    page = 1,
    limit = 20
  ) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw ApiError.notFound('Account not found');
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          OR: [{ accountId }, { destinationAccountId: accountId }],
        },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          category: true,
          account: true,
          destinationAccount: true,
        },
      }),
      prisma.transaction.count({
        where: {
          OR: [{ accountId }, { destinationAccountId: accountId }],
        },
      }),
    ]);

    return {
      account,
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
