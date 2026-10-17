import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { TransactionsPage } from './pages/transactions/TransactionsPage';
import { BudgetsPage } from './pages/budgets/BudgetsPage';
import { GoalsPage } from './pages/goals/GoalsPage';
import { AiAssistantPage } from './pages/ai/AiAssistantPage';
import { 
  checkBackendHealth, 
  type HealthResponse 
} from './services/api';
import { 
  Server, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Layers, 
  Activity,
  ShieldCheck,
  Clock,
  LogIn,
  UserPlus,
  LayoutDashboard
} from 'lucide-react';

function HealthOverview() {
  const { isAuthenticated, user } = useAuth();
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkBackendHealth();
      setHealthData(data);
      setLastChecked(new Date());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to reach backend server');
      }
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const isDbConnected = healthData?.database.status === 'connected';
  const isServerHealthy = healthData?.status === 'healthy';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-bold text-xl">
              AI
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                AI Finance Manager
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Phase 5: Secure AI Financial Assistant Integration
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Go to Dashboard ({user?.firstName})</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register</span>
                </Link>
              </>
            )}
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">{loading ? 'Checking...' : 'Check API'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                <ShieldCheck className="h-3.5 w-3.5" />
                Phase 2 Authentication Operational
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Secure Authentication & Authorization Engine
              </h2>
              <p className="mt-2 text-slate-300 text-sm max-w-2xl">
                End-to-end security: User registration, bcrypt password hashing, 1-minute Email OTP verification, JWT access & refresh token rotation with reuse detection, rate limiting, and role-based access control.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Test User Registration</span>
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Test Login Flow</span>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto text-xs text-slate-400 bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Last checked: {lastChecked.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-800 text-sm flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Frontend Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">Frontend Client</h3>
              <p className="text-xs text-slate-500 mt-1">
                React 19 + TypeScript + Vite + Tailwind CSS
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Host:</span>
                <span className="font-mono">localhost:5173</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auth State:</span>
                <span className="font-semibold text-emerald-700">{isAuthenticated ? 'Authenticated' : 'Guest'}</span>
              </div>
            </div>
          </div>

          {/* Backend Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Server className="h-5 w-5" />
                </div>
                {loading ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Checking
                  </span>
                ) : isServerHealthy ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <XCircle className="h-3.5 w-3.5" /> Offline
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-900">Backend API</h3>
              <p className="text-xs text-slate-500 mt-1">
                Express + TypeScript + JWT + Rate Limits
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Endpoint:</span>
                <span className="font-mono">{import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Uptime:</span>
                <span className="font-mono">{healthData ? `${healthData.uptimeSeconds}s` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Database Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Database className="h-5 w-5" />
                </div>
                {loading ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Checking
                  </span>
                ) : isDbConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> Disconnected
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-900">MySQL Database</h3>
              <p className="text-xs text-slate-500 mt-1">
                Prisma 5.22 with Auth Enhancements
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Database:</span>
                <span className="font-mono">ai_finance_manager</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">DB Latency:</span>
                <span className="font-mono">
                  {healthData?.database.latencyMs !== null && healthData?.database.latencyMs !== undefined
                    ? `${healthData.database.latencyMs}ms`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 2 Verification Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Phase 2 Security Deliverables Completed</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Registration & Password Hashing</p>
                <p className="text-xs text-slate-500 mt-0.5">Bcrypt salt rounds 12, Zod validation, zero sensitive data leakage in JSON responses</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Email OTP Verification (1 Min Expiry)</p>
                <p className="text-xs text-slate-500 mt-0.5">Cryptographic 6-digit OTP, SHA-256 storage, 5-attempt brute-force protection, prior code invalidation</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">JWT Token Rotation & Reuse Detection</p>
                <p className="text-xs text-slate-500 mt-0.5">Short-lived 15m access token, HttpOnly refresh cookie, token family invalidation upon reuse attack</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Forgot & Reset Password Security</p>
                <p className="text-xs text-slate-500 mt-0.5">Generic non-enumerating responses, single-use scoped OTP, all previous sessions revoked</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Role-Based Access Control (RBAC)</p>
                <p className="text-xs text-slate-500 mt-0.5">USER and ADMIN roles, reusable auth middleware, and strict role permission enforcement</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Rate Limiting & Helmet Headers</p>
                <p className="text-xs text-slate-500 mt-0.5">Express-rate-limit guards on auth, OTP verify, and OTP resend endpoints; Helmet HTTP security</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI Finance Manager &bull; Phase 4: Budgets, Goals & Analytics Verified &bull; Next: Phase 5 AI Assistant
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HealthOverview />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <AccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <BudgetsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <GoalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AiAssistantPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
