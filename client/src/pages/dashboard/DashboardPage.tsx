import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppNavbar } from '../../components/layout/AppNavbar';
import {
  analyticsService,
  type AnalyticsPeriod,
  type CashFlowSummary,
  type CategoryBreakdownResponse,
  type MonthlyTrendItem,
  type AccountBalancesResponse,
  type BudgetSummaryResponse,
  type GoalsSummaryResponse,
} from '../../services/analytics.service';
import { formatCurrency } from '../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  PieChart as PieChartIcon,
  Target,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Plus,
  Percent,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PIE_COLORS = [
  '#059669', // Emerald
  '#2563eb', // Blue
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#dc2626', // Red
  '#4f46e5', // Indigo
  '#65a30d', // Lime
  '#64748b', // Slate
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>('this_month');

  // Analytics states
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownResponse | null>(null);
  const [trends, setTrends] = useState<MonthlyTrendItem[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalancesResponse | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummaryResponse | null>(null);
  const [goalsSummary, setGoalsSummary] = useState<GoalsSummaryResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, cat, tr, acc, bud, gls] = await Promise.all([
        analyticsService.getSummary({ period }),
        analyticsService.getCategoryBreakdown({ period }),
        analyticsService.getMonthlyTrends(6),
        analyticsService.getAccountBalances(),
        analyticsService.getBudgetSummary(),
        analyticsService.getGoalsSummary(),
      ]);

      setSummary(sum);
      setCategoryBreakdown(cat);
      setTrends(tr);
      setAccountBalances(acc);
      setBudgetSummary(bud);
      setGoalsSummary(gls);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const netCashFlowNum = summary ? parseFloat(summary.netCashFlow) : 0;
  const isNetPositive = netCashFlowNum >= 0;

  // Format Recharts data for Monthly Trends
  const trendChartData = trends.map((t) => ({
    name: t.monthLabel,
    Income: parseFloat(t.income),
    Expense: parseFloat(t.expense),
    Net: parseFloat(t.netCashFlow),
  }));

  // Format Recharts data for Category Breakdown
  const categoryChartData =
    categoryBreakdown?.breakdown.map((c) => ({
      name: c.categoryName,
      value: parseFloat(c.amount),
    })) || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Hero & Period Selector */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Live Financial Intelligence
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="mt-2 text-emerald-100/80 text-sm max-w-xl">
                Comprehensive analytics engine powered by your active transactions, double-entry ledgers, category budgets, and savings goals.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30"
              >
                <Plus className="h-4 w-4" />
                <span>New Transaction</span>
              </Link>
              <Link
                to="/budgets"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20"
              >
                <PieChartIcon className="h-4 w-4" />
                <span>Set Budget</span>
              </Link>
            </div>
          </div>

          {/* Period Filter Selector */}
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm p-1 rounded-xl border border-white/10 text-xs">
              {(
                [
                  ['this_month', 'This Month'],
                  ['last_month', 'Last Month'],
                  ['last_3_months', '3 Months'],
                  ['last_6_months', '6 Months'],
                  ['this_year', 'This Year'],
                  ['all', 'All Time'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    period === key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh Analytics</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Cash Flow Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Income */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Income
              </span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(summary?.totalIncome)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {summary?.transactionCounts.income || 0} income credits logged
              </p>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Expenses
              </span>
              <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {formatCurrency(summary?.totalExpenses)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {summary?.transactionCounts.expense || 0} expense debits logged
              </p>
            </div>
          </div>

          {/* Net Cash Flow */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Net Cash Flow
              </span>
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                  isNetPositive
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div
                className={`text-2xl font-black font-mono ${
                  isNetPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(summary?.netCashFlow)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isNetPositive ? 'Positive surplus' : 'Deficit in period'}
              </p>
            </div>
          </div>

          {/* Savings Rate */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Savings Rate
              </span>
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-900 font-mono">
                {summary?.savingsRate || 0}%
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(summary?.savingsRate || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section: Monthly Trends & Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Income vs Expenses BarChart */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Income vs Expenses (Last 6 Months)
                </h3>
                <p className="text-xs text-slate-500">
                  Monthly cash flow trajectories and net savings
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Monthly Comparison
              </span>
            </div>

            <div className="h-72 w-full mt-4">
              {trends.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No monthly trend data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Income" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expense" fill="#e11d48" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Expense Category Breakdown PieChart */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Category Spending</h3>
                <p className="text-xs text-slate-500">Breakdown for {summary?.period}</p>
              </div>
              <Link
                to="/categories"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                <span>Tags</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              {categoryChartData.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-12">
                  No expense records logged in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {categoryChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category breakdown top list */}
            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
              {categoryBreakdown?.breakdown.slice(0, 4).map((c, i) => (
                <div key={c.categoryId} className="pt-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                      {c.categoryName}
                    </span>
                  </div>
                  <div className="font-mono text-slate-700">
                    <span className="font-bold">{formatCurrency(c.amount)}</span>{' '}
                    <span className="text-[10px] text-slate-400">({c.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lower Modules Overview Row: Budgets, Goals, Accounts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Budget Summary Widget */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <PieChartIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Budget Health</h3>
                    <p className="text-xs text-slate-500">Current month limit guard</p>
                  </div>
                </div>
                <Link
                  to="/budgets"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-2 space-y-3">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-500">Budgeted:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(budgetSummary?.totalBudgeted)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-500">Spent so far:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(budgetSummary?.totalSpent)}
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">Overall Utilization</span>
                    <span className="font-mono text-slate-900">
                      {budgetSummary?.overallUtilizationPercent || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        (budgetSummary?.overallUtilizationPercent || 0) > 100
                          ? 'bg-rose-600'
                          : (budgetSummary?.overallUtilizationPercent || 0) >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{
                        width: `${Math.min(budgetSummary?.overallUtilizationPercent || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Status Badges */}
                <div className="pt-2 flex items-center gap-2 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {budgetSummary?.onTrackCount || 0} On Track
                  </span>
                  {(budgetSummary?.approachingCount || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {budgetSummary?.approachingCount} Warning
                    </span>
                  )}
                  {(budgetSummary?.exceededCount || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      {budgetSummary?.exceededCount} Exceeded
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                to="/budgets"
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
              >
                <span>Manage Monthly Budgets</span>
              </Link>
            </div>
          </div>

          {/* Savings Goals Widget */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Savings Goals</h3>
                    <p className="text-xs text-slate-500">Target milestone tracking</p>
                  </div>
                </div>
                <Link
                  to="/goals"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-2 space-y-3">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-500">Total Saved:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatCurrency(goalsSummary?.totalSavedAmount)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-500">Overall Target:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(goalsSummary?.totalTargetAmount)}
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">Average Progress</span>
                    <span className="font-mono text-slate-900">
                      {goalsSummary?.overallProgressPercent || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{
                        width: `${goalsSummary?.overallProgressPercent || 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {goalsSummary?.activeCount || 0} Active
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {goalsSummary?.completedCount || 0} Reached
                  </span>
                  {(goalsSummary?.overdueCount || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {goalsSummary?.overdueCount} Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                to="/goals"
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
              >
                <span>View Savings Milestones</span>
              </Link>
            </div>
          </div>

          {/* Accounts Summary Widget (Grouped strictly by Currency) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Account Reserves</h3>
                    <p className="text-xs text-slate-500">By currency balances</p>
                  </div>
                </div>
                <Link
                  to="/accounts"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-2 space-y-3">
                {accountBalances?.currencies.map((curr) => (
                  <div key={curr.currency} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        {curr.currency} Total
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(curr.totalBalance, curr.currency)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {curr.accountCount} Account{curr.accountCount > 1 ? 's' : ''} in {curr.currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                to="/accounts"
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
              >
                <span>Manage Accounts Ledger</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI Finance Manager &bull; Phase 4: Budgets, Goals & Analytics Verified &bull; Next: Phase 5 AI Assistant
      </footer>
    </div>
  );
};
