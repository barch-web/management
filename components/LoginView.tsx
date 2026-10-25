'use client';

import React, { useState } from 'react';
import { Shield, Lock, UserCheck, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { Role } from '@/lib/rbac';
import type { UserAccount } from '@/lib/auth-logic';

interface LoginViewProps {
  accounts: UserAccount[];
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const DEMO_ROLE_CREDENTIALS: Array<{
  role: Role;
  username: string;
  label: string;
  scopeNote: string;
}> = [
  {
    role: Role.DIRECTOR,
    username: 'director.vance',
    label: 'Director',
    scopeNote: 'Super Admin · All Modules, Financials & Account Provisioning',
  },
  {
    role: Role.OPERATION_MANAGER,
    username: 'ops.hale',
    label: 'Operation Manager',
    scopeNote: 'Super Admin · Full Operations & Account Provisioning',
  },
  {
    role: Role.SUPERVISOR,
    username: 'sup.keller',
    label: 'Supervisor',
    scopeNote: 'Site Rosters, Shift Approvals & Incident Escalation',
  },
  {
    role: Role.ACCOUNTANT,
    username: 'acct.lindqvist',
    label: 'Accountant',
    scopeNote: 'Invoicing, Expenses, Payroll Hours & Financial Reports',
  },
  {
    role: Role.HR_MANAGER,
    username: 'hr.okafor',
    label: 'HR Manager',
    scopeNote: 'Personnel Dossiers, Leave Approvals, Contracts & SIA Licenses',
  },
  {
    role: Role.GUARD,
    username: 'guard.mercer',
    label: 'Guard',
    scopeNote: 'Self-Service Roster, GPS Clock-In/Out & Post Incident Filing',
  },
  {
    role: Role.CCTV_TECHNICIAN,
    username: 'tech.patel',
    label: 'CCTV Technician',
    scopeNote: 'Surveillance Installations, NVR Inventory & Technical Sign-Off',
  },
  {
    role: Role.CLIENT,
    username: 'client.apex',
    label: 'Client (Apex Vaults)',
    scopeNote: 'Restricted Portal · Own Contracted Sites, Coverage & Invoices',
  },
];

export function LoginView({ accounts, onLogin }: LoginViewProps) {
  const [username, setUsername] = useState('director.vance');
  const [password, setPassword] = useState('Sentinel#2026');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await onLogin(username, password);
      if (!res.success) {
        setError(res.error || 'Authentication failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectRolePreset = (presetUsername: string) => {
    setUsername(presetUsername);
    setPassword('Sentinel#2026');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#060D1A] text-white flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-[#0B192C] px-4 sm:px-6 py-4 flex items-center justify-between gap-4 sm:gap-8">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white text-[#0B192C] flex items-center justify-center rounded">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
            AEGIS VANGUARD
          </span>
        </div>
        <div className="hidden xl:flex items-center gap-6 text-xs text-slate-300">
          <span>Manned Guarding</span>
          <span aria-hidden="true">·</span>
          <span>Industrial Security</span>
          <span aria-hidden="true">·</span>
          <span>Cash-in-Transit (CIT)</span>
          <span aria-hidden="true">·</span>
          <span>CCTV Surveillance</span>
          <span aria-hidden="true">·</span>
          <span>Asset Protection</span>
        </div>
        <div className="text-[11px] sm:text-xs font-mono text-slate-300 whitespace-nowrap shrink-0">
          COMMAND ACCESS
        </div>
      </header>

      {/* Main Split Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Credentials Sign-In Box */}
        <div className="lg:col-span-5 bg-white text-slate-900 rounded border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="mb-6 pb-5 border-b border-slate-200">
            <p className="text-xs font-mono text-slate-500 mb-1">
              SUPABASE AUTH · USERNAME CREDENTIAL GATEWAY
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0B192C] tracking-tight text-balance">
              Personnel & Client Sign-In
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Authenticate with your unique system username and issued password.
              Email-link, OAuth, and public self-registration are disabled.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Unique Username (Sole Login Identifier)
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. director.vance"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#0B192C] focus:bg-white"
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Do not enter an email address. Usernames are mapped internally to
                Supabase Auth credentials.
              </p>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#0B192C] focus:bg-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#0B192C] hover:bg-[#0F2547] text-white text-sm font-semibold rounded transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Verifying Credentials...' : 'Sign In to Operations Console'}</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-[#0B192C] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Account Provisioning Policy</span>
            </div>
            <p>
              Public self-registration is strictly disabled. Only{' '}
              <strong className="text-slate-900">Director</strong> and{' '}
              <strong className="text-slate-900">Operation Manager</strong> roles
              can issue new credentials, assign roles, or reset passwords.
            </p>
          </div>
        </div>

        {/* Right Column: 8-Role Credential Selector for Instant Verification */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0B192C] border border-slate-800 rounded p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Role-Based Access Control (RBAC) Verification Accounts
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Select any of the 8 provisioned company roles below to prefill
                  credentials (default password:{' '}
                  <code className="font-mono text-white">Sentinel#2026</code>) and
                  inspect role-isolated views.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-300">
                {accounts.filter((a) => a.status === 'active').length} Active Accounts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_ROLE_CREDENTIALS.map((item) => {
                const isSelected = username.toLowerCase() === item.username;
                const liveAccount = accounts.find(
                  (a) => a.username === item.username
                );
                return (
                  <button
                    key={item.username}
                    type="button"
                    onClick={() => handleSelectRolePreset(item.username)}
                    className={`text-left p-3.5 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white text-[#0B192C] border-white'
                        : 'bg-[#060D1A] text-white border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-tight">
                        {item.label}
                      </span>
                      <span
                        className={`text-xs font-mono ${
                          isSelected ? 'text-[#0B192C] font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {item.username}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-1.5 leading-snug ${
                        isSelected ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {item.scopeNote}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/20 flex items-center justify-between text-[11px] font-mono">
                      <span>
                        Status: {liveAccount?.status === 'deactivated' ? 'Deactivated' : 'Active'}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7 Security Business Lines Overview */}
          <div className="bg-[#0B192C] border border-slate-800 rounded p-6">
            <h3 className="text-xs font-mono text-slate-300 mb-3">
              OPERATIONAL SERVICE LINES COVERED BY THIS SYSTEM
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-200">
              <div className="py-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>01. Manned Guarding</span>
                <span className="font-mono text-slate-400">24/7 Posts</span>
              </div>
              <div className="py-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>02. Industrial Security</span>
                <span className="font-mono text-slate-400">ATEX & Refineries</span>
              </div>
              <div className="py-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>03. Cash-in-Transit (CIT)</span>
                <span className="font-mono text-slate-400">Armored Fleet</span>
              </div>
              <div className="py-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>04. Valuable Transport</span>
                <span className="font-mono text-slate-400">Bullion & Diplomatic</span>
              </div>
              <div className="py-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>05. CCTV Installation & Surveillance</span>
                <span className="font-mono text-slate-400">SOC & NVR Matrix</span>
              </div>
              <div className="py-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>06. Event Security</span>
                <span className="font-mono text-slate-400">Crowd & VIP Screening</span>
              </div>
              <div className="py-1.5 border-b border-slate-800 flex items-center justify-between sm:col-span-2">
                <span>07. Asset Storage & Protection</span>
                <span className="font-mono text-slate-400">Subterranean Bonded Vaults</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-[#060D1A] px-6 py-4 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <span>Aegis Vanguard Security Services Ltd · Enterprise Operations Platform</span>
        <span className="font-mono">Supabase PostgreSQL + Row-Level Security (RLS)</span>
      </footer>
    </div>
  );
}
