import React, { useEffect, useState } from 'react';
import { AppNavbar } from '../../components/layout/AppNavbar';
import {
  financialService,
  type Category,
  type CategoryType,
} from '../../services/financial.service';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Tab filter: 'ALL' | 'EXPENSE' | 'INCOME'
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    type: CategoryType;
  }>({
    name: '',
    type: 'EXPENSE',
  });
  const [creating, setCreating] = useState<boolean>(false);

  // Edit Modal State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financialService.getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await financialService.createCategory({
        name: createForm.name.trim(),
        type: createForm.type,
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', type: 'EXPENSE' });
      setActionSuccess('Custom category created successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    setUpdating(true);
    setError(null);
    try {
      await financialService.updateCategory(editingCategory.id, {
        name: editName.trim(),
      });
      setEditingCategory(null);
      setActionSuccess('Category updated successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update category');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (cat.isSystem) {
      setError('System categories are protected and cannot be deleted.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete custom category "${cat.name}"? If any transactions are linked to it, deletion will be blocked.`
      )
    ) {
      return;
    }

    setDeletingId(cat.id);
    setError(null);
    try {
      await financialService.deleteCategory(cat.id);
      setActionSuccess(`Category "${cat.name}" deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchCategories();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to delete category. Categories linked to transactions cannot be deleted.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    if (activeTab === 'ALL') return true;
    return cat.type === activeTab;
  });

  const expenseCount = categories.filter((c) => c.type === 'EXPENSE').length;
  const incomeCount = categories.filter((c) => c.type === 'INCOME').length;
  const customCount = categories.filter((c) => !c.isSystem).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Categories
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Classify your income streams and expense expenditures for detailed budgeting and analytics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCategories}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Category</span>
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

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Expense Categories
              </span>
              <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {expenseCount}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Income Categories
              </span>
              <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {incomeCount}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                User Custom Tags
              </span>
              <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {customCount}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('EXPENSE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'EXPENSE'
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Expenses ({expenseCount})
          </button>
          <button
            onClick={() => setActiveTab('INCOME')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'INCOME'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Income ({incomeCount})
          </button>
        </div>

        {/* Category List */}
        {loading && categories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-xs text-slate-500">No categories found matching this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCategories.map((cat) => {
              const isExpense = cat.type === 'EXPENSE';

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isExpense
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      <Tag className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{cat.name}</span>
                        {cat.isSystem ? (
                          <span
                            title="System Default: Protected"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 uppercase"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            <span>System</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-700 uppercase">
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>Custom</span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isExpense ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {cat.type}
                      </span>
                    </div>
                  </div>

                  {/* Actions for custom categories */}
                  {!cat.isSystem ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setEditName(cat.name);
                        }}
                        title="Rename Category"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        disabled={deletingId === cat.id}
                        title="Delete Category"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div title="System category (cannot be modified)">
                      <Lock className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl relative animate-scaleUp">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="font-bold text-slate-900 text-base mb-1">New Custom Category</h3>
              <p className="text-xs text-slate-500 mb-4">
                Create a customized label for your transactions.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gym, Pet Care, Dividends"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, type: 'EXPENSE' })}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        createForm.type === 'EXPENSE'
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, type: 'INCOME' })}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        createForm.type === 'INCOME'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Income
                    </button>
                  </div>
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
                    {creating ? 'Saving...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl relative animate-scaleUp">
              <button
                onClick={() => setEditingCategory(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="font-bold text-slate-900 text-base mb-1">Rename Category</h3>
              <p className="text-xs text-slate-500 mb-4">
                Update custom category title.
              </p>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI Finance Manager &bull; Phase 3: Categories Module &bull; Default & Custom Tagging
      </footer>
    </div>
  );
};
