import React, { useEffect, useState } from 'react';
import { AppNavbar } from '../../components/layout/AppNavbar';
import {
  goalService,
  type Goal,
} from '../../services/goal.service';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Calendar,
  PiggyBank,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>('');
  const [createTargetAmount, setCreateTargetAmount] = useState<string>('');
  const [createCurrentAmount, setCreateCurrentAmount] = useState<string>('0');
  const [createTargetDate, setCreateTargetDate] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  // Edit Modal State
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editTargetAmount, setEditTargetAmount] = useState<string>('');
  const [editCurrentAmount, setEditCurrentAmount] = useState<string>('');
  const [editTargetDate, setEditTargetDate] = useState<string>('');
  const [editIsCompleted, setEditIsCompleted] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await goalService.getGoals();
      setGoals(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load savings goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(createTargetAmount);
    const current = parseFloat(createCurrentAmount) || 0;

    if (!createName.trim()) {
      setError('Please provide a goal name');
      return;
    }

    if (!target || target <= 0) {
      setError('Target amount must be strictly greater than 0');
      return;
    }

    if (current < 0) {
      setError('Current savings cannot be negative');
      return;
    }

    if (current > target) {
      setError('Initial savings cannot exceed target amount');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await goalService.createGoal({
        name: createName.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate: createTargetDate || null,
      });

      setShowCreateModal(false);
      setCreateName('');
      setCreateTargetAmount('');
      setCreateCurrentAmount('0');
      setCreateTargetDate('');
      setActionSuccess('Savings goal created successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchGoals();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (g: Goal) => {
    setEditingGoal(g);
    setEditName(g.name);
    setEditTargetAmount(g.targetAmount);
    setEditCurrentAmount(g.currentAmount);
    setEditTargetDate(g.targetDate ? g.targetDate.split('T')[0] : '');
    setEditIsCompleted(g.isCompleted);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;

    const target = parseFloat(editTargetAmount);
    const current = parseFloat(editCurrentAmount);

    if (!target || target <= 0) {
      setError('Target amount must be strictly greater than 0');
      return;
    }

    if (current < 0) {
      setError('Current savings cannot be negative');
      return;
    }

    if (current > target) {
      setError('Current savings cannot exceed the target amount');
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      await goalService.updateGoal(editingGoal.id, {
        name: editName.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate: editTargetDate || null,
        isCompleted: editIsCompleted,
      });

      setEditingGoal(null);
      setActionSuccess('Savings goal updated successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchGoals();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update goal');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete savings goal "${name}"?`)) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      await goalService.deleteGoal(id);
      setActionSuccess(`Goal "${name}" deleted.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchGoals();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete goal');
    } finally {
      setDeletingId(null);
    }
  };

  // Top summary metrics
  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0);
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.currentAmount), 0);
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 10000) / 100) : 0;

  const completedCount = goals.filter((g) => g.status === 'COMPLETED').length;
  const overdueCount = goals.filter((g) => g.status === 'OVERDUE').length;
  const activeCount = goals.filter((g) => g.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Savings Goals
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Plan for milestone purchases, emergency funds, and future financial dreams.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchGoals}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Goal</span>
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
              Total Target Goal
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(totalTarget)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{goals.length} Registered Goals</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Saved Amount
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
              {formatCurrency(totalSaved)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Accumulated savings</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Goals Status
            </span>
            <div className="flex items-center gap-3 mt-1.5 text-xs font-bold">
              <span className="text-emerald-700">{completedCount} Done</span>
              <span className="text-blue-700">{activeCount} Active</span>
              {overdueCount > 0 && <span className="text-amber-700">{overdueCount} Overdue</span>}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Status breakdown</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Overall Progress
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {overallProgress}%
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Goals Grid */}
        {loading && goals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading savings goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No savings goals set yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Define your goals—such as an emergency reserve, dream vacation, or vehicle purchase—and track your milestones.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Savings Goal</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {goals.map((g) => {
              const isCompleted = g.status === 'COMPLETED';
              const isOverdue = g.status === 'OVERDUE';

              return (
                <div
                  key={g.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                    isCompleted
                      ? 'border-emerald-200'
                      : isOverdue
                      ? 'border-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-600'
                              : isOverdue
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-indigo-50 text-indigo-600'
                          }`}
                        >
                          <PiggyBank className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{g.name}</h3>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-0.5 ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOverdue
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isCompleted && <CheckCircle className="h-2.5 w-2.5" />}
                            {isOverdue && <Clock className="h-2.5 w-2.5" />}
                            <span>{g.status}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(g)}
                          title="Edit Goal"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(g.id, g.name)}
                          disabled={deletingId === g.id}
                          title="Delete Goal"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Amount Row */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xl font-black text-slate-900 font-mono">
                          {formatCurrency(g.currentAmount)}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 font-mono">
                          of {formatCurrency(g.targetAmount)}
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden my-2">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-600' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${g.progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>{g.progressPercent}% reached</span>
                        <span>{formatCurrency(g.remainingAmount)} remaining</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Target Date & Monthly Savings Needed */}
                  <div className="mt-5 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    {g.targetDate ? (
                      <div className="flex items-center justify-between text-slate-600 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Calendar className="h-3 w-3" />
                          <span>Target:</span>
                        </span>
                        <span className="font-medium">{formatDate(g.targetDate)}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">No target date specified</div>
                    )}

                    {!isCompleted && g.monthlySavingsNeeded && (
                      <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-[11px]">
                        <span className="text-indigo-800 font-semibold inline-flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>Required Rate:</span>
                        </span>
                        <span className="font-mono font-bold text-indigo-900">
                          {formatCurrency(g.monthlySavingsNeeded)}/mo
                        </span>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-center text-xs font-bold text-emerald-800">
                        🎉 Milestone Reached!
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Goal */}
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
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">New Savings Goal</h3>
                  <p className="text-xs text-slate-500">Plan and track target financial milestones</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Goal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Emergency Fund, Japan Trip, Downpayment"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="100000.00"
                      value={createTargetAmount}
                      onChange={(e) => setCreateTargetAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Saved (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={createCurrentAmount}
                      onChange={(e) => setCreateCurrentAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={createTargetDate}
                    onChange={(e) => setCreateTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Setting a target date computes the recommended monthly savings rate.
                  </p>
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
                    {creating ? 'Saving...' : 'Set Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Goal */}
        {editingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative animate-scaleUp">
              <button
                onClick={() => setEditingGoal(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="font-bold text-slate-900 text-base mb-1">Update Savings Goal</h3>
              <p className="text-xs text-slate-500 mb-4">
                Update goal parameters or manual saved progress.
              </p>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Goal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={editTargetAmount}
                      onChange={(e) => setEditTargetAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current Saved (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editCurrentAmount}
                      onChange={(e) => setEditCurrentAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isCompletedCheck"
                    checked={editIsCompleted}
                    onChange={(e) => setEditIsCompleted(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isCompletedCheck" className="text-xs font-semibold text-slate-700">
                    Mark as Completed
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingGoal(null)}
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
        AI Finance Manager &bull; Phase 4: Savings Goals &bull; Milestone Tracking
      </footer>
    </div>
  );
};
