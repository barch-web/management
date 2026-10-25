'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  KeyRound,
  History,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  Role,
  ALL_ROLES,
  canManageAccounts,
  getPermissionLevel,
  type ModuleKey,
  type PermissionLevel,
} from '@/lib/rbac';
import type { UserAccount, CreateAccountInput } from '@/lib/auth-logic';
import type { SystemState } from '@/lib/seed-data';

interface UserRoleManagementModuleProps {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateAccount: (
    input: CreateAccountInput
  ) => Promise<{ success: boolean; error?: string }>;
  onChangeRole: (
    targetId: string,
    newRole: Role
  ) => Promise<{ success: boolean; error?: string }>;
  onToggleStatus: (
    targetId: string,
    newStatus: 'active' | 'deactivated'
  ) => Promise<{ success: boolean; error?: string }>;
  onResetPassword: (
    targetId: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  onUpdateOpsFinanceAccess: (level: PermissionLevel) => void;
}

const MATRIX_MODULES: Array<{ key: ModuleKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users_roles', label: 'User & Role Admin' },
  { key: 'hr_employees', label: 'HR & Employees' },
  { key: 'scheduling_shifts', label: 'Scheduling & Shifts' },
  { key: 'sites_clients', label: 'Sites & Clients' },
  { key: 'incidents', label: 'Incident Reporting' },
  { key: 'cit_transport', label: 'CIT & Valuables' },
  { key: 'cctv_surveillance', label: 'CCTV Surveillance' },
  { key: 'accounting_invoicing', label: 'Accounting & Invoicing' },
  { key: 'client_portal', label: 'Client Portal' },
  { key: 'reports_analytics', label: 'Reports & Analytics' },
];

export function UserRoleManagementModule({
  currentUser,
  state,
  onCreateAccount,
  onChangeRole,
  onToggleStatus,
  onResetPassword,
  onUpdateOpsFinanceAccess,
}: UserRoleManagementModuleProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>(Role.GUARD);
  const [clientId, setClientId] = useState('client-1');
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  if (!canManageAccounts(currentUser.role)) {
    return (
      <div className="p-8 border border-red-200 rounded bg-red-50 text-red-900">
        <h2 className="font-display text-lg font-bold">
          Access Restricted (RBAC Policy Enforcement)
        </h2>
        <p className="text-sm mt-1">
          Only users with the <strong>Director</strong> or{' '}
          <strong>Operation Manager</strong> role may access account
          provisioning, role assignment, or password reset functions.
        </p>
      </div>
    );
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await onCreateAccount({
      username,
      password,
      fullName,
      phone,
      role,
      clientId: role === Role.CLIENT ? clientId : undefined,
      assignedSiteIds: ['site-1'],
    });

    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Failed to provision account.' });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Account "${username.trim().toLowerCase()}" provisioned with role ${role} and logged to audit trail.`,
    });
    setUsername('');
    setPassword('');
    setFullName('');
    setPhone('');
  };

  const handleConfirmPasswordReset = async (targetId: string) => {
    setFeedback(null);
    const res = await onResetPassword(targetId, resetPasswordVal);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Password reset failed.' });
      return;
    }
    setFeedback({
      type: 'success',
      message: 'User password reset verified via server policy and logged to audit trail.',
    });
    setResetTargetId(null);
    setResetPasswordVal('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500">
            DIRECTOR & OPERATION MANAGER ONLY · SERVER-SIDE & SUPABASE RLS ENFORCED
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
            User Provisioning, Role Assignment & Security Audit Trail
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Public self-registration is disabled. Provision credentials, assign
            roles across all 8 tiers, and inspect immutable audit logs.
          </p>
        </div>

        {/* Configurable Operation Manager Financial Access (Section 4.2) */}
        {currentUser.role === Role.DIRECTOR && (
          <div className="p-3.5 border border-slate-200 rounded bg-slate-50 flex items-center gap-3">
            <div>
              <label
                htmlFor="ops-finance-config"
                className="block text-xs font-bold text-[#0B192C]"
              >
                Operation Manager Financial Data Access
              </label>
              <span className="text-[11px] text-slate-500">
                Configurable per Section 4.2 (Default: view-only)
              </span>
            </div>
            <select
              id="ops-finance-config"
              value={state.rbacConfig.operationManagerFinancialAccess}
              onChange={(e) =>
                onUpdateOpsFinanceAccess(e.target.value as PermissionLevel)
              }
              className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded text-slate-900"
            >
              <option value="none">none (Blocked)</option>
              <option value="view">view (Read-Only Default)</option>
              <option value="edit">edit (Create/Update Invoices)</option>
              <option value="admin">admin (Full Financial Admin)</option>
            </select>
          </div>
        )}
      </div>

      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded border text-xs flex items-center gap-2.5 ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Grid: Provision New Account Form + Accounts Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Provision Form */}
        <form
          onSubmit={handleCreateSubmit}
          className="lg:col-span-4 border border-slate-200 rounded bg-white p-6 space-y-4"
          noValidate
        >
          <div className="pb-3 border-b border-slate-200">
            <h2 className="font-display text-base font-bold text-[#0B192C] flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span>Provision New Account</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Maps username internally to Supabase Auth without exposing email.
            </p>
          </div>

          <div>
            <label
              htmlFor="new-username"
              className="block text-xs font-semibold text-slate-800 mb-1"
            >
              Unique Username
            </label>
            <input
              id="new-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. guard.thorne"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-semibold text-slate-800 mb-1"
            >
              Initial Password (min 8 chars)
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <div>
            <label
              htmlFor="new-fullname"
              className="block text-xs font-semibold text-slate-800 mb-1"
            >
              Full Legal Name
            </label>
            <input
              id="new-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Marcus Thorne"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <div>
            <label
              htmlFor="new-phone"
              className="block text-xs font-semibold text-slate-800 mb-1"
            >
              Contact Phone
            </label>
            <input
              id="new-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 20 7946 0199"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <div>
            <label
              htmlFor="new-role"
              className="block text-xs font-semibold text-slate-800 mb-1"
            >
              Assigned RBAC Role
            </label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-[#0B192C]"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {role === Role.CLIENT && (
            <div>
              <label
                htmlFor="new-client-link"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Linked Client Organization (RLS Isolation)
              </label>
              <select
                id="new-client-link"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded bg-white"
              >
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-[#0B192C] hover:bg-[#0F2547] text-white text-xs font-semibold rounded transition-colors cursor-pointer"
          >
            Create User Account
          </button>
        </form>

        {/* Provisioned Accounts Roster */}
        <div className="lg:col-span-8 border border-slate-200 rounded bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Provisioned System Accounts ({state.accounts.length})
            </h2>
            <span className="text-xs font-mono text-slate-500">
              Role Assignment · Activation · Password Reset
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Username & Name</th>
                  <th className="py-2.5 px-4">Assigned Role</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {state.accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-[#0B192C]">
                        {acc.username}
                      </div>
                      <div className="text-slate-600">
                        <span>{acc.fullName}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono whitespace-nowrap">{acc.phone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        aria-label={`Change role for ${acc.username}`}
                        value={acc.role}
                        onChange={(e) =>
                          onChangeRole(acc.id, e.target.value as Role)
                        }
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span
                        className={
                          acc.status === 'active'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-red-700 font-semibold'
                        }
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          setResetTargetId(
                            resetTargetId === acc.id ? null : acc.id
                          )
                        }
                        className="px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Reset Password
                      </button>
                      {acc.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleStatus(
                              acc.id,
                              acc.status === 'active'
                                ? 'deactivated'
                                : 'active'
                            )
                          }
                          className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                            acc.status === 'active'
                              ? 'border border-red-300 text-red-700 hover:bg-red-50'
                              : 'bg-[#0B192C] text-white hover:bg-[#0F2547]'
                          }`}
                        >
                          {acc.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                      {resetTargetId === acc.id && (
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <input
                            type="password"
                            aria-label={`New password for ${acc.username}`}
                            value={resetPasswordVal}
                            onChange={(e) => setResetPasswordVal(e.target.value)}
                            placeholder="New password (8+ chars)"
                            className="px-2.5 py-1 text-xs font-mono border border-slate-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmPasswordReset(acc.id)}
                            className="px-2.5 py-1 bg-[#0B192C] text-white text-xs font-semibold rounded cursor-pointer"
                          >
                            Confirm Reset
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RBAC Permissions Matrix (Module x Role -> none/view/edit/admin) */}
      <div className="border border-slate-200 rounded bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-sm font-bold text-[#0B192C]">
            RBAC Permissions Matrix (Module × Role → none / view / edit / admin)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enforced simultaneously in the navigation/UI layer, API endpoints,
            and Supabase PostgreSQL RLS policies.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <th className="py-2.5 px-3">Role</th>
                {MATRIX_MODULES.map((m) => (
                  <th key={m.key} className="py-2.5 px-2.5 whitespace-nowrap">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {ALL_ROLES.map((r) => (
                <tr key={r} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-sans font-semibold text-[#0B192C] whitespace-nowrap">
                    {r}
                  </td>
                  {MATRIX_MODULES.map((m) => {
                    const lvl = getPermissionLevel(r, m.key, state.rbacConfig);
                    return (
                      <td
                        key={m.key}
                        className={`py-2.5 px-2.5 ${
                          lvl === 'admin'
                            ? 'text-[#0B192C] font-bold'
                            : lvl === 'edit'
                            ? 'text-emerald-700 font-semibold'
                            : lvl === 'view'
                            ? 'text-slate-700'
                            : 'text-slate-300'
                        }`}
                      >
                        {lvl}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Trail (Section 5.2 & Section 9) */}
      <div className="border border-slate-200 rounded bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-[#0B192C] flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>Account & Role Management Audit Log ({state.auditLogs.length})</span>
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Immutable Security Trail
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Actor (Role)</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Target Account</th>
                <th className="py-2.5 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {state.auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {log.timestamp.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    <span className="font-mono">{log.actorUsername}</span> · {log.actorRole}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-[#0B192C]">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-800">
                    {log.targetUsername}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
