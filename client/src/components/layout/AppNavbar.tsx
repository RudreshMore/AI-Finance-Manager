import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Wallet,
  Tag,
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Activity,
} from 'lucide-react';

export const AppNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Accounts', path: '/accounts', icon: Wallet },
    { name: 'Categories', path: '/categories', icon: Tag },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-bold text-lg">
                AI
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                  AI Finance Manager
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase">
                  Phase 3: Financial Core
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              title="System Diagnostics"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition hidden sm:inline-flex"
            >
              <Activity className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-800">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav row */}
        <div className="flex md:hidden border-t border-slate-100 py-2 space-x-1 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
