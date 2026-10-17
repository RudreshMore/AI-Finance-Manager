import React, { useEffect, useState, useCallback } from 'react';
import { AppNavbar } from '../../components/layout/AppNavbar';
import {
  budgetService,
  type Budget,
} from '../../services/budget.service';
import {
  financialService,
  type Category,
} from '../../services/financial.service';
import { formatCurrency } from '../../utils/formatters';
import {
  PieChart,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export const BudgetsPage: React.FC = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getUTCFullYear());

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createCategoryId, setCreateCategoryId] = useState<string>('');
  const [createAmount, setCreateAmount] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  // Edit Modal State
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch expense categories for budget assignment
  const loadCategories = async () => {
    try {
      const data = await financialService.getCategories('EXPENSE');
      setCategories(data);
      if (data.length > 0) {
        setCreateCategoryId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load expense categories:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Fetch budgets for selected month and year
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await budgetService.getBudgets({
        month: selectedMonth,
        year: selectedYear,
      });
      setBudgets(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Create budget
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(createAmount);
    if (!amountNum || amountNum <= 0) {
      setError('Budget amount must be strictly greater than 0');
      return;
    }

    if (!createCategoryId) {
      setError('Please select an expense category');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await budgetService.createBudget({
        categoryId: createCategoryId,
        amount: amountNum,
        month: selectedMonth,
        year: selectedYear,
      });

      setShowCreateModal(false);
      setCreateAmount('');
      setActionSuccess('Monthly budget configured successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchBudgets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create budget');
    } finally {
      setCreating(false);
    }
  };

  // Update budget
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;

    const amountNum = parseFloat(editAmount);
    if (!amountNum || amountNum <= 0) {
      setError('Budget amount must be strictly greater than 0');
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      await budgetService.updateBudget(editingBudget.id, {
        amount: amountNum,
      });

      setEditingBudget(null);
      setActionSuccess('Budget amount updated successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchBudgets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update budget');
    } finally {
      setUpdating(false);
    }
  };

  // Delete budget
  const handleDelete = async (id: string, categoryName: string) => {
    if (!window.confirm(`Are you sure you want to remove the budget for "${categoryName}"? Existing transactions will remain untouched.`)) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      await budgetService.deleteBudget(id);
      setActionSuccess(`Budget for "${categoryName}" deleted.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchBudgets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete budget');
    } finally {
      setDeletingId(null);
    }
  };

  // Summary computations
  const totalBudgeted = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spent), 0);
  const netRemaining = totalBudgeted - totalSpent;
  const overallUtilization = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 10000) / 100 : 0;

  const exceededCount = budgets.filter((b) => b.status === 'EXCEEDED').length;
  const approachingCount = budgets.filter((b) => b.status === 'APPROACHING').length;

  // Month label
  const monthName = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Monthly Budgets
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Set spending limits per category, prevent overspending, and track real-time utilization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Month / Year Navigator */}
            <div className="inline-flex items-center bg-white border border-slate-300 rounded-xl shadow-sm p-1">
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 whitespace-nowrap min-w-[120px] text-center">
                {monthName} {selectedYear}
              </span>
              <button
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={fetchBudgets}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Budget</span>
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

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Budgeted
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(totalBudgeted)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{budgets.length} Category Budgets</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Actual Spending
            </span>
            <div className="text-2xl font-black text-rose-600 font-mono mt-1">
              {formatCurrency(totalSpent)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">From recorded expenses</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {netRemaining >= 0 ? 'Remaining Buffer' : 'Total Overspent'}
            </span>
            <div
              className={`text-2xl font-black font-mono mt-1 ${
                netRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(Math.abs(netRemaining))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {netRemaining >= 0 ? 'Within limit' : 'Limit exceeded'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Overall Utilization
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {overallUtilization}%
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all duration-500 ${
                  overallUtilization > 100
                    ? 'bg-rose-600'
                    : overallUtilization >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(overallUtilization, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Warning Banners for Approaching / Exceeded Budgets */}
        {(exceededCount > 0 || approachingCount > 0) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {exceededCount > 0 && (
              <div className="flex-1 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>
                  <strong>{exceededCount}</strong> budget{exceededCount > 1 ? 's have' : ' has'} exceeded 100% of the allocated spending limit!
                </span>
              </div>
            )}
            {approachingCount > 0 && (
              <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>{approachingCount}</strong> budget{approachingCount > 1 ? 's are' : ' is'} approaching limits (&ge; 80% spent).
                </span>
              </div>
            )}
          </div>
        )}

        {/* Budgets Grid */}
        {loading && budgets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading budgets for {monthName}...</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <PieChart className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No budgets configured for {monthName} {selectedYear}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Stay in control of your expenses by setting spending goals for your key categories.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Budget for {monthName}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {budgets.map((b) => {
              const isExceeded = b.status === 'EXCEEDED';
              const isApproaching = b.status === 'APPROACHING';

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                    isExceeded
                      ? 'border-rose-200'
                      : isApproaching
                      ? 'border-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold ${
                            isExceeded
                              ? 'bg-rose-50 text-rose-600'
                              : isApproaching
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          <TrendingDown className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">
                            {b.category.name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-0.5 ${
                              isExceeded
                                ? 'bg-rose-100 text-rose-800'
                                : isApproaching
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isExceeded
                              ? 'Exceeded Limit'
                              : isApproaching
                              ? 'Approaching Limit'
                              : 'On Track'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingBudget(b);
                            setEditAmount(b.amount);
                          }}
                          title="Edit Budget Amount"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id, b.category.name)}
                          disabled={deletingId === b.id}
                          title="Delete Budget"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Monetary Overview */}
                    <div className="grid grid-cols-2 gap-3 py-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium">Spent</span>
                        <div className="font-mono font-bold text-slate-800 mt-0.5">
                          {formatCurrency(b.spent)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium">Budgeted</span>
                        <div className="font-mono font-bold text-slate-800 mt-0.5">
                          {formatCurrency(b.amount)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-500">Utilization</span>
                        <span
                          className={`font-mono ${
                            isExceeded
                              ? 'text-rose-600'
                              : isApproaching
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {b.utilizationPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isExceeded
                              ? 'bg-rose-600'
                              : isApproaching
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(b.utilizationPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Remaining / Overspent */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {parseFloat(b.remaining) >= 0 ? 'Remaining:' : 'Overspent by:'}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        parseFloat(b.remaining) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(Math.abs(parseFloat(b.remaining)))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Budget */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative animate-scaleUp">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">New Monthly Budget</h3>
                  <p className="text-xs text-slate-500">
                    Allocating limit for {monthName} {selectedYear}
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Category *
                  </label>
                  <select
                    required
                    value={createCategoryId}
                    onChange={(e) => setCreateCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.isSystem ? '(System)' : '(Custom)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Budget Limit Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 15000.00"
                    value={createAmount}
                    onChange={(e) => setCreateAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
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
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Set Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Budget */}
        {editingBudget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl relative animate-scaleUp">
              <button
                onClick={() => setEditingBudget(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="font-bold text-slate-900 text-base mb-1">
                Edit Budget ({editingBudget.category.name})
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Adjust spending limit for {monthName} {selectedYear}.
              </p>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Budget Limit (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingBudget(null)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Update Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI Finance Manager &bull; Phase 4: Budgets Module &bull; Real-Time Spending Tracking
      </footer>
    </div>
  );
};
