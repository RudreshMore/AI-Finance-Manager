import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { AppNavbar } from '../../components/layout/AppNavbar';
import {
  financialService,
  type Account,
  type Transaction,
} from '../../services/financial.service';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Wallet,
  Tag,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTestResult, setAdminTestResult] = useState<{ status: string; message: string } | null>(null);
  const [testingAdmin, setTestingAdmin] = useState(false);

  // Quick Financial Overview State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState<boolean>(true);

  useEffect(() => {
    const fetchQuickFinancials = async () => {
      setLoadingFinancials(true);
      try {
        const [accs, txRes] = await Promise.all([
          financialService.getAccounts(),
          financialService.getTransactions({ limit: 5 }),
        ]);
        setAccounts(accs);
        setRecentTransactions(txRes.data);
      } catch (err) {
        console.error('Failed to load dashboard financials:', err);
      } finally {
        setLoadingFinancials(false);
      }
    };

    fetchQuickFinancials();
  }, []);

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (parseFloat(acc.balance) || 0),
    0
  );

  const testAdminAccess = async () => {
    setTestingAdmin(true);
    setAdminTestResult(null);
    try {
      const res = await apiClient.get('/auth/admin-check');
      setAdminTestResult({
        status: 'success',
        message: res.data.message || 'Admin authorization granted!',
      });
    } catch (err: any) {
      setAdminTestResult({
        status: 'error',
        message: err.response?.data?.message || 'Access denied: requires ADMIN role.',
      });
    } finally {
      setTestingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <AppNavbar />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Hero */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Phase 3 Financial Core Online
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="mt-2 text-emerald-100/80 text-sm max-w-xl">
                Your financial dashboard is linked to your atomic accounts ledger, double-entry transfer engine, and categories classifier.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/transactions"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30"
                >
                  <Plus className="h-4 w-4" />
                  <span>Record Transaction</span>
                </Link>
                <Link
                  to="/accounts"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Manage Accounts</span>
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 bg-black/25 backdrop-blur-sm p-5 rounded-2xl border border-white/10 text-xs">
              <span className="text-[11px] text-emerald-300/80 uppercase font-bold tracking-wider">
                Total Net Balance
              </span>
              <div className="text-2xl font-black font-mono text-white">
                {formatCurrency(totalBalance)}
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-slate-300 text-[11px]">
                <span>{accounts.length} Accounts Configured</span>
                <span className="font-semibold text-emerald-300">INR (₹)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Quick Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Accounts Module Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-400 font-mono">
                  {accounts.length} Active
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Financial Accounts</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bank accounts, wallets, cash, credit cards with strict decimal balance tracking.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 font-mono">
                {formatCurrency(totalBalance)}
              </span>
              <Link
                to="/accounts"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                <span>View All</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Categories Module Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                  <Tag className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-400">Default & Custom</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Income & Expense Tags</h3>
              <p className="text-xs text-slate-500 mt-1">
                Seed categories for food, shopping, salary, bills with custom tag authoring.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">13+ Standard Categories</span>
              <Link
                to="/categories"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                <span>Manage</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Transactions Module Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-400">Atomic Reversals</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Transactions & Transfers</h3>
              <p className="text-xs text-slate-500 mt-1">
                Income, expense, and inter-account transfers with automatic balance updates.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Double-entry transfers</span>
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                <span>Open Ledger</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Transactions Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
              <p className="text-xs text-slate-500">Latest entries logged into your financial ledger</p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {loadingFinancials ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading ledger...</div>
          ) : recentTransactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-500">No transactions recorded yet.</p>
              <Link
                to="/transactions"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record First Transaction</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                const isExpense = tx.type === 'EXPENSE';

                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          isIncome
                            ? 'bg-emerald-50 text-emerald-600'
                            : isExpense
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}
                      >
                        {isIncome ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : isExpense ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <ArrowLeftRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {tx.description || (tx.category ? tx.category.name : tx.type)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatDate(tx.transactionDate)} &bull; {tx.account?.name || 'Account'}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`font-mono font-bold ${
                        isIncome
                          ? 'text-emerald-600'
                          : isExpense
                          ? 'text-rose-600'
                          : 'text-indigo-600'
                      }`}
                    >
                      {isIncome ? '+ ' : isExpense ? '- ' : ''}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security & RBAC Verification Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Authenticated Profile</h3>
                <p className="text-xs text-slate-500">Live response from GET /api/auth/me</p>
              </div>
            </div>

            <dl className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <dt className="text-slate-500">User ID</dt>
                <dd className="font-mono text-slate-800 truncate max-w-[200px]">{user?.id}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-500">Full Name</dt>
                <dd className="font-semibold text-slate-800">{user?.firstName} {user?.lastName}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-500">Email Address</dt>
                <dd className="font-mono text-slate-800">{user?.email}</dd>
              </div>
              <div className="py-2 flex justify-between items-center">
                <dt className="text-slate-500">Role Authority</dt>
                <dd>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    user?.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {user?.role}
                  </span>
                </dd>
              </div>
              <div className="py-2 flex justify-between items-center">
                <dt className="text-slate-500">Email Verification</dt>
                <dd className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </dd>
              </div>
            </dl>
          </div>

          {/* RBAC Tester Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">RBAC Enforcement Test</h3>
                  <p className="text-xs text-slate-500">Probe GET /api/auth/admin-check</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Test the backend role-based access control. If your role is <strong>USER</strong>, the backend will reject this request with <strong>403 Forbidden</strong>. If your role is <strong>ADMIN</strong>, access is authorized.
              </p>

              {adminTestResult && (
                <div className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                  adminTestResult.status === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}>
                  {adminTestResult.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{adminTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={testAdminAccess}
                disabled={testingAdmin}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {testingAdmin ? 'Testing Permissions...' : 'Execute Admin-Only Endpoint Test'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI Finance Manager &bull; Phase 3: Financial Core Module Verified &bull; Next: Phase 4 Budgets & Goals
      </footer>
    </div>
  );
};
