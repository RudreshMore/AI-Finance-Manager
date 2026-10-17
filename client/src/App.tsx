import { useEffect, useState } from 'react';
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
  Clock
} from 'lucide-react';

export default function App() {
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
                Phase 1: Foundation & Architecture Setup
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{loading ? 'Checking...' : 'Re-check Status'}</span>
            </button>
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Dev Mode
            </span>
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
                Phase 1 Verification
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Full-Stack System Connectivity
              </h2>
              <p className="mt-2 text-slate-300 text-sm max-w-2xl">
                Real-time validation for Vite + React client, Express.js backend, strict TypeScript compiler, Prisma ORM, and MySQL 8.0 database engine.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto text-xs text-slate-400 bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Last ping: {lastChecked.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

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
                <span className="text-slate-400">Environment:</span>
                <span className="font-mono">{import.meta.env.MODE}</span>
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
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <XCircle className="h-3.5 w-3.5" /> Offline
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-900">Backend API</h3>
              <p className="text-xs text-slate-500 mt-1">
                Node.js + Express + TypeScript
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
              <div className="flex justify-between">
                <span className="text-slate-400">Roundtrip:</span>
                <span className="font-mono">{healthData ? `${healthData.durationMs}ms` : 'N/A'}</span>
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
                MySQL 8.0 via Prisma ORM 5.22
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Engine:</span>
                <span className="font-mono">MySQL (Port 3306)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">DB Latency:</span>
                <span className="font-mono">
                  {healthData?.database.latencyMs !== null && healthData?.database.latencyMs !== undefined
                    ? `${healthData.database.latencyMs}ms`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">State:</span>
                <span className="font-mono capitalize font-medium text-slate-800">
                  {healthData?.database.status || 'unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error / Warning Alert if not connected */}
        {(error || (healthData && !isDbConnected)) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <h4 className="font-semibold text-amber-950">Connection Notice</h4>
              <p className="text-amber-800">
                {error
                  ? `Backend is unreachable at ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}. Ensure the backend server is running via 'npm run dev' inside the server/ directory.`
                  : `Database status: ${healthData?.database.error || 'Cannot communicate with MySQL'}. Ensure your MySQL credentials are set in server/.env and the database 'ai_finance_manager' exists.`}
              </p>
            </div>
          </div>
        )}

        {/* Phase 1 Verification Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Phase 1 Architecture Deliverables</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Clean Monorepo Scaffolding</p>
                <p className="text-xs text-slate-500 mt-0.5">Isolated client/ and server/ workspaces with root .gitignore and security rules</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Strict TypeScript Engine</p>
                <p className="text-xs text-slate-500 mt-0.5">Strict typing, explicit returns, noUncheckedIndexedAccess, and ES2022 compatibility</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Prisma ORM & MySQL Schema</p>
                <p className="text-xs text-slate-500 mt-0.5">User, OtpToken, RefreshToken, Account, Category, Transaction, Budget, Goal with DECIMAL(14,2)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Zod Environment Validation</p>
                <p className="text-xs text-slate-500 mt-0.5">Type-safe environment parsing preventing startup under invalid or missing configs</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Prisma Client Singleton</p>
                <p className="text-xs text-slate-500 mt-0.5">Global singleton preventing pool exhaustion across development hot-reloads</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Live Health Diagnostic API</p>
                <p className="text-xs text-slate-500 mt-0.5">GET /api/health verifies server state, query latency, and database ping</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI Finance Manager &bull; Phase 1 Foundation &bull; Next: Phase 2 Authentication & Security
      </footer>
    </div>
  );
}
