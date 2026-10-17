import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import {
  User,
  Shield,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [adminTestResult, setAdminTestResult] = useState<{ status: string; message: string } | null>(null);
  const [testingAdmin, setTestingAdmin] = useState(false);

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
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
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
                Phase 2: Authentication & Security Verified
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-800">{user?.firstName} {user?.lastName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome Hero */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Session Authenticated
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="mt-2 text-emerald-100/80 text-sm max-w-xl">
                Your account is verified and protected with cryptographically rotated JWT access & refresh tokens, password hashing, and role-based access control.
              </p>
            </div>
            <div className="flex flex-col gap-2 bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-mono">
                <Shield className="h-4 w-4" />
                <span>Role: {user?.role}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 font-mono">
                <Clock className="h-4 w-4" />
                <span>Verified: {user?.isVerified ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & RBAC Verification Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Authenticated Profile</h3>
                <p className="text-xs text-slate-500">Live response from GET /api/auth/me</p>
              </div>
            </div>

            <dl className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">User ID</dt>
                <dd className="font-mono text-xs text-slate-800 truncate max-w-[200px]">{user?.id}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">Full Name</dt>
                <dd className="font-semibold text-slate-800">{user?.firstName} {user?.lastName}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">Email Address</dt>
                <dd className="font-mono text-xs text-slate-800">{user?.email}</dd>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <dt className="text-slate-500">Role Authority</dt>
                <dd>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    user?.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {user?.role}
                  </span>
                </dd>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <dt className="text-slate-500">Email Verification</dt>
                <dd className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Verified
                </dd>
              </div>
            </dl>
          </div>

          {/* RBAC Tester Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
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
                <div className={`p-4 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
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

        {/* Phase 2 Complete Banner */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Phase 2 Ready for Next Step</h4>
              <p className="text-xs text-slate-500">Upcoming: Phase 3 Financial Core (Accounts, Categories, Transactions)</p>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
          >
            View System Health Diagnostic View
          </Link>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI Finance Manager &bull; Phase 2: Authentication & Security Module Verified
      </footer>
    </div>
  );
};
