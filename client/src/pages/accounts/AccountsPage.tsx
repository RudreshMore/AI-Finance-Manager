import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppNavbar } from '../../components/layout/AppNavbar';
import {
  financialService,
  type Account,
  type AccountType,
} from '../../services/financial.service';
import { formatCurrency, getAccountTypeLabel } from '../../utils/formatters';
import {
  Wallet,
  Building2,
  Banknote,
  CreditCard,
  PiggyBank,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Landmark,
} from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    type: AccountType;
    initialBalance: string;
    currency: string;
  }>({
    name: '',
    type: 'BANK',
    initialBalance: '0',
    currency: 'INR',
  });
  const [creating, setCreating] = useState<boolean>(false);

  // Edit Modal State
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financialService.getAccounts();
      setAccounts(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await financialService.createAccount({
        name: createForm.name.trim(),
        type: createForm.type,
        initialBalance: parseFloat(createForm.initialBalance) || 0,
        currency: createForm.currency || 'INR',
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', type: 'BANK', initialBalance: '0', currency: 'INR' });
      setActionSuccess('Account successfully created!');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName.trim()) return;

    setUpdating(true);
    setError(null);
    try {
      await financialService.updateAccount(editingAccount.id, {
        name: editName.trim(),
      });
      setEditingAccount(null);
      setActionSuccess('Account updated successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update account');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? If this account has recorded transactions, deletion will be blocked to safeguard audit history.`)) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      await financialService.deleteAccount(id);
      setActionSuccess(`Account "${name}" deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchAccounts();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to delete account. Accounts with transaction history cannot be deleted.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'BANK':
        return <Building2 className="h-5 w-5 text-blue-600" />;
      case 'SAVINGS':
        return <PiggyBank className="h-5 w-5 text-emerald-600" />;
      case 'CASH':
        return <Banknote className="h-5 w-5 text-amber-600" />;
      case 'WALLET':
        return <Wallet className="h-5 w-5 text-indigo-600" />;
      case 'CREDIT_CARD':
        return <CreditCard className="h-5 w-5 text-rose-600" />;
      default:
        return <Landmark className="h-5 w-5 text-slate-600" />;
    }
  };

  // Financial summary calculations
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (parseFloat(acc.balance) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Financial Accounts
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your bank accounts, cash reserves, wallets, credit cards, and investments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAccounts}
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
              <span>Add Account</span>
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

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Net Balance
            </span>
            <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Aggregated across all registered accounts</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Accounts
            </span>
            <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
              {accounts.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Ready for transaction tracking</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Quick Action
              </span>
              <p className="text-xs font-medium text-slate-700 mt-1">Need to log cash or transfer funds?</p>
            </div>
            <Link
              to="/transactions"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              <span>Transactions</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Accounts Grid */}
        {loading && accounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No accounts configured yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by adding your main bank account, physical cash wallet, or credit card.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Account</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((acc) => {
              const numericBalance = parseFloat(acc.balance);
              const isNegative = numericBalance < 0;

              return (
                <div
                  key={acc.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
                          {getAccountIcon(acc.type)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">
                            {acc.name}
                          </h3>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                            {getAccountTypeLabel(acc.type)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingAccount(acc);
                            setEditName(acc.name);
                          }}
                          title="Edit Account Name"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id, acc.name)}
                          disabled={deletingId === acc.id}
                          title="Delete Account"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-medium text-slate-400">Current Balance</span>
                      <div
                        className={`text-xl font-black font-mono mt-0.5 ${
                          isNegative ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(acc.balance, acc.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Currency: {acc.currency}
                    </span>
                    <Link
                      to={`/transactions?accountId=${acc.id}`}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      <span>Ledger</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Account Modal */}
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
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add New Account</h3>
                  <p className="text-xs text-slate-500">Configure financial account details</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Salary, SBI Savings, Cash Wallet"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Type *
                  </label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as AccountType })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CASH">Cash Reserve</option>
                    <option value="WALLET">Digital Wallet (Paytm, PhonePe)</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="OTHER">Other Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening / Initial Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={createForm.initialBalance}
                    onChange={(e) => setCreateForm({ ...createForm, initialBalance: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Starting balance will be recorded as your initial account ledger.
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
                    {creating ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Account Modal */}
        {editingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl relative animate-scaleUp">
              <button
                onClick={() => setEditingAccount(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="font-bold text-slate-900 text-base mb-1">Rename Account</h3>
              <p className="text-xs text-slate-500 mb-4">
                Update account display label without altering balances.
              </p>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Name *
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
                    onClick={() => setEditingAccount(null)}
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
        AI Finance Manager &bull; Phase 3: Accounts Module &bull; Strict Decimal Precision
      </footer>
    </div>
  );
};
