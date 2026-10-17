import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppNavbar } from '../../components/layout/AppNavbar';
import {
  financialService,
  type Account,
  type Category,
  type Transaction,
  type TransactionType,
} from '../../services/financial.service';
import {
  formatCurrency,
  formatDate,
  getTransactionTypeLabel,
} from '../../utils/formatters';
import {
  ArrowLeftRight,
  Trash2,
  Edit2,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Pagination metadata
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filter states (initialize from URL params if present)
  const [filterAccountId, setFilterAccountId] = useState<string>(
    searchParams.get('accountId') || ''
  );
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modal: Record Transaction
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [creating, setCreating] = useState<boolean>(false);

  // Form states for Create
  const [formAccountId, setFormAccountId] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formToAccountId, setFormToAccountId] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formDescription, setFormDescription] = useState<string>('');

  // Modal: Edit Transaction
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load auxiliary data: accounts & categories
  const loadMeta = async () => {
    try {
      const [accData, catData] = await Promise.all([
        financialService.getAccounts(),
        financialService.getCategories(),
      ]);
      setAccounts(accData);
      setCategories(catData);

      // Set default account for creation if available
      if (accData.length > 0 && !formAccountId) {
        setFormAccountId(accData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load accounts/categories meta:', err);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  // Fetch transactions with applied filters
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financialService.getTransactions({
        page,
        limit,
        accountId: filterAccountId || undefined,
        categoryId: filterCategoryId || undefined,
        type: (filterType as TransactionType) || undefined,
        search: searchQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setTransactions(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    filterAccountId,
    filterCategoryId,
    filterType,
    searchQuery,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle URL param changes
  useEffect(() => {
    const paramAccId = searchParams.get('accountId');
    if (paramAccId && paramAccId !== filterAccountId) {
      setFilterAccountId(paramAccId);
    }
  }, [searchParams]);

  // Open create modal with clean defaults
  const handleOpenCreateModal = (tab: 'INCOME' | 'EXPENSE' | 'TRANSFER') => {
    setModalTab(tab);
    setFormAmount('');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);

    if (accounts.length > 0) {
      setFormAccountId(accounts[0].id);
      if (accounts.length > 1) {
        setFormToAccountId(accounts[1].id);
      } else {
        setFormToAccountId('');
      }
    }

    // Default category for tab
    const filteredCats = categories.filter((c) =>
      tab === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'
    );
    if (filteredCats.length > 0) {
      setFormCategoryId(filteredCats[0].id);
    } else {
      setFormCategoryId('');
    }

    setShowCreateModal(true);
  };

  // Submit Create Transaction
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(formAmount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Amount must be a positive number greater than 0');
      return;
    }

    if (!formAccountId) {
      setError('Please select an account');
      return;
    }

    if (modalTab === 'TRANSFER') {
      if (!formToAccountId) {
        setError('Please select a destination account');
        return;
      }
      if (formAccountId === formToAccountId) {
        setError('Source and destination accounts must be different');
        return;
      }
    } else {
      if (!formCategoryId) {
        setError('Please select a category');
        return;
      }
    }

    setCreating(true);
    setError(null);
    try {
      if (modalTab === 'TRANSFER') {
        await financialService.createTransfer({
          fromAccountId: formAccountId,
          toAccountId: formToAccountId,
          amount: numericAmount,
          transactionDate: formDate ? new Date(formDate).toISOString() : undefined,
          description: formDescription.trim() || undefined,
        });
        setActionSuccess('Fund transfer successfully executed!');
      } else {
        await financialService.createTransaction({
          accountId: formAccountId,
          categoryId: formCategoryId,
          type: modalTab,
          amount: numericAmount,
          transactionDate: formDate ? new Date(formDate).toISOString() : undefined,
          description: formDescription.trim() || undefined,
        });
        setActionSuccess(
          `${modalTab === 'INCOME' ? 'Income' : 'Expense'} recorded successfully!`
        );
      }

      setShowCreateModal(false);
      setTimeout(() => setActionSuccess(null), 4000);
      await Promise.all([fetchTransactions(), loadMeta()]);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to record transaction. Check account balance and overdraft rules.'
      );
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(tx.amount);
    setEditDate(tx.transactionDate.split('T')[0]);
    setEditDescription(tx.description || '');
    setEditCategoryId(tx.categoryId || '');
  };

  // Submit Edit Transaction
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const numericAmount = parseFloat(editAmount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Amount must be a positive number greater than 0');
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      await financialService.updateTransaction(editingTx.id, {
        amount: numericAmount,
        transactionDate: editDate ? new Date(editDate).toISOString() : undefined,
        description: editDescription.trim() || undefined,
        categoryId: editCategoryId || undefined,
      });

      setEditingTx(null);
      setActionSuccess('Transaction updated and account balance adjusted!');
      setTimeout(() => setActionSuccess(null), 4000);
      await Promise.all([fetchTransactions(), loadMeta()]);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to update transaction. Ensure resulting account balance does not violate overdraft rules.'
      );
    } finally {
      setUpdating(false);
    }
  };

  // Delete Transaction
  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this transaction? The corresponding account balance will be automatically reversed.'
      )
    ) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      await financialService.deleteTransaction(id);
      setActionSuccess('Transaction deleted and account balance restored.');
      setTimeout(() => setActionSuccess(null), 4000);
      await Promise.all([fetchTransactions(), loadMeta()]);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to delete transaction. Reversal would violate account overdraft rules.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterAccountId('');
    setFilterCategoryId('');
    setFilterType('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Transactions Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Search, filter, and record double-entry balanced income, expenses, and account transfers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal('EXPENSE')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <TrendingDown className="h-4 w-4" />
              <span>Record Expense</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal('INCOME')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Record Income</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal('TRANSFER')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Transfer Funds</span>
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Filter className="h-4 w-4 text-emerald-600" />
              <span>Filter & Search</span>
            </div>
            {(filterAccountId ||
              filterCategoryId ||
              filterType ||
              searchQuery ||
              startDate ||
              endDate) && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Account Filter */}
            <div>
              <select
                value={filterAccountId}
                onChange={(e) => {
                  setFilterAccountId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">All Types</option>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={filterCategoryId}
                onChange={(e) => {
                  setFilterCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range: Start */}
            <div>
              <input
                type="date"
                title="Start Date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading && transactions.length === 0 ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Loading ledger records...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ArrowLeftRight className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No transactions recorded</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No financial transactions match your current query or filter selections.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => handleOpenCreateModal('EXPENSE')}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  Record First Expense
                </button>
                <button
                  onClick={() => handleOpenCreateModal('INCOME')}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  Record First Income
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category / Note</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {transactions.map((tx) => {
                    const isIncome = tx.type === 'INCOME';
                    const isExpense = tx.type === 'EXPENSE';
                    const isTransfer = tx.type === 'TRANSFER';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                        {/* Date */}
                        <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                          {formatDate(tx.transactionDate)}
                        </td>

                        {/* Description */}
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {tx.description || (
                            <span className="text-slate-400 italic">No description</span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {tx.category ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {tx.category.name}
                            </span>
                          ) : isTransfer ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                              Fund Transfer
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Uncategorized</span>
                          )}
                        </td>

                        {/* Account */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-medium text-slate-800">
                            {tx.account?.name || 'Account'}
                          </span>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-800'
                                : isExpense
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {isIncome && <TrendingUp className="h-3 w-3" />}
                            {isExpense && <TrendingDown className="h-3 w-3" />}
                            {isTransfer && <ArrowLeftRight className="h-3 w-3" />}
                            <span>{getTransactionTypeLabel(tx.type)}</span>
                          </span>
                        </td>

                        {/* Amount */}
                        <td
                          className={`py-3 px-4 text-right font-bold font-mono whitespace-nowrap ${
                            isIncome
                              ? 'text-emerald-600'
                              : isExpense
                              ? 'text-rose-600'
                              : 'text-indigo-600'
                          }`}
                        >
                          {isIncome && '+ '}
                          {isExpense && '- '}
                          {formatCurrency(tx.amount)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(tx)}
                              title="Edit transaction"
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              disabled={deletingId === tx.id}
                              title="Delete transaction and reverse balance"
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1 || loading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition disabled:opacity-40 inline-flex items-center gap-1 font-semibold"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages || loading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition disabled:opacity-40 inline-flex items-center gap-1 font-semibold"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Record Transaction */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl relative animate-scaleUp">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Modal Tabs */}
              <div className="flex items-center space-x-1 border-b border-slate-200 pb-3 mb-4">
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('EXPENSE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                    modalTab === 'EXPENSE'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('INCOME')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                    modalTab === 'INCOME'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Income</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('TRANSFER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                    modalTab === 'TRANSFER'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span>Account Transfer</span>
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {modalTab === 'TRANSFER' ? (
                  /* Transfer Specific Fields */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        From Account *
                      </label>
                      <select
                        required
                        value={formAccountId}
                        onChange={(e) => setFormAccountId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatCurrency(a.balance)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        To Account *
                      </label>
                      <select
                        required
                        value={formToAccountId}
                        onChange={(e) => setFormToAccountId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id} disabled={a.id === formAccountId}>
                            {a.name} {a.id === formAccountId ? '(Source)' : `(${formatCurrency(a.balance)})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Income / Expense Specific Fields */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Account *
                      </label>
                      <select
                        required
                        value={formAccountId}
                        onChange={(e) => setFormAccountId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatCurrency(a.balance)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category *
                      </label>
                      <select
                        required
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        {categories
                          .filter((c) =>
                            modalTab === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Amount & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Transaction Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly salary, Grocery shopping, Rent payment"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition disabled:opacity-50 ${
                      modalTab === 'EXPENSE'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : modalTab === 'INCOME'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {creating
                      ? 'Recording...'
                      : modalTab === 'TRANSFER'
                      ? 'Execute Transfer'
                      : `Record ${modalTab === 'INCOME' ? 'Income' : 'Expense'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Transaction */}
        {editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative animate-scaleUp">
              <button
                onClick={() => setEditingTx(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="font-bold text-slate-900 text-base mb-1">
                Edit Transaction ({getTransactionTypeLabel(editingTx.type)})
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Updating amount will automatically recompute the associated account balance.
              </p>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                {editingTx.type !== 'TRANSFER' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      {categories
                        .filter((c) => c.type === editingTx.type)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Update Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI Finance Manager &bull; Phase 3: Transactions & Double-Entry Transfers &bull; Atomic Balance Ledger
      </footer>
    </div>
  );
};
