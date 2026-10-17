import { apiClient } from './api';

export type AccountType =
  | 'BANK'
  | 'CASH'
  | 'WALLET'
  | 'CREDIT_CARD'
  | 'SAVINGS'
  | 'INVESTMENT'
  | 'OTHER';

export type CategoryType = 'INCOME' | 'EXPENSE';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: string;
  currency: string;
  isArchived: boolean;
  transactionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: CategoryType;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amount: string;
  description?: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  account?: Account;
  destinationAccount?: Account | null;
  category?: Category | null;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const accountsApi = {
  list: async (): Promise<Account[]> => {
    const res = await apiClient.get('/accounts');
    return res.data.data;
  },
  get: async (id: string): Promise<Account> => {
    const res = await apiClient.get(`/accounts/${id}`);
    return res.data.data;
  },
  create: async (data: {
    name: string;
    type: AccountType;
    initialBalance?: number | string;
    currency?: string;
  }): Promise<Account> => {
    const res = await apiClient.post('/accounts', data);
    return res.data.data;
  },
  update: async (
    id: string,
    data: { name?: string; type?: AccountType; isArchived?: boolean }
  ): Promise<Account> => {
    const res = await apiClient.put(`/accounts/${id}`, data);
    return res.data.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/accounts/${id}`);
    return res.data;
  },
  getTransactions: async (
    id: string,
    page = 1,
    limit = 20
  ): Promise<{
    account: Account;
    transactions: Transaction[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const res = await apiClient.get(`/accounts/${id}/transactions?page=${page}&limit=${limit}`);
    return res.data.data;
  },
};

export const categoriesApi = {
  list: async (type?: CategoryType): Promise<Category[]> => {
    const res = await apiClient.get(`/categories${type ? `?type=${type}` : ''}`);
    return res.data.data;
  },
  create: async (data: {
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
  }): Promise<Category> => {
    const res = await apiClient.post('/categories', data);
    return res.data.data;
  },
  update: async (
    id: string,
    data: { name?: string; icon?: string; color?: string }
  ): Promise<Category> => {
    const res = await apiClient.put(`/categories/${id}`, data);
    return res.data.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/categories/${id}`);
    return res.data;
  },
};

export const transactionsApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    type?: TransactionType;
    accountId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<PaginatedTransactions> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const res = await apiClient.get(`/transactions?${query.toString()}`);
    return res.data.data;
  },
  get: async (id: string): Promise<Transaction> => {
    const res = await apiClient.get(`/transactions/${id}`);
    return res.data.data;
  },
  create: async (data: {
    type: TransactionType;
    amount: number | string;
    accountId: string;
    destinationAccountId?: string;
    categoryId?: string;
    description?: string;
    transactionDate?: string;
  }): Promise<{ transaction: Transaction; newBalance?: string }> => {
    const res = await apiClient.post('/transactions', data);
    return res.data.data;
  },
  transfer: async (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number | string;
    description?: string;
    transactionDate?: string;
  }): Promise<{ transaction: Transaction; sourceBalance: string; destinationBalance: string }> => {
    const res = await apiClient.post('/transactions/transfer', data);
    return res.data.data;
  },
  update: async (
    id: string,
    data: {
      amount?: number | string;
      categoryId?: string;
      description?: string;
      transactionDate?: string;
    }
  ): Promise<Transaction> => {
    const res = await apiClient.put(`/transactions/${id}`, data);
    return res.data.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/transactions/${id}`);
    return res.data;
  },
};

export const financialService = {
  getAccounts: accountsApi.list,
  getAccount: accountsApi.get,
  createAccount: accountsApi.create,
  updateAccount: accountsApi.update,
  deleteAccount: accountsApi.delete,
  getAccountTransactions: accountsApi.getTransactions,

  getCategories: categoriesApi.list,
  createCategory: categoriesApi.create,
  updateCategory: categoriesApi.update,
  deleteCategory: categoriesApi.delete,

  getTransactions: async (params?: Parameters<typeof transactionsApi.list>[0]) => {
    const res = await transactionsApi.list(params);
    return { data: res.transactions, pagination: res.pagination };
  },
  getTransaction: transactionsApi.get,
  createTransaction: transactionsApi.create,
  createTransfer: transactionsApi.transfer,
  updateTransaction: transactionsApi.update,
  deleteTransaction: transactionsApi.delete,
};
