'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  History,
  AlertCircle,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import {
  Role,
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
  onUpdateAccount: (
    targetId: string,
    updates: { username?: string; fullName?: string; phone?: string; role?: Role }
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteAccount: (
    targetId: string
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
  onAddRole: (roleName: string) => void;
  onEditRole: (oldRoleName: string, newRoleName: string) => void;
  onDeleteRole: (roleName: string) => void;
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
  onUpdateAccount,
  onDeleteAccount,
  onChangeRole,
  onToggleStatus,
  onResetPassword,
  onUpdateOpsFinanceAccess,
  onAddRole,
  onEditRole,
  onDeleteRole,
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

  // Edit user state
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<Role>(Role.GUARD);

  // Roles CRUD state
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRoleName, setEditingRoleName] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState('');

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
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to provision account.',
      });
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

  const handleSaveUserEdit = async (targetId: string) => {
    setFeedback(null);
    const res = await onUpdateAccount(targetId, {
      username: editUsername,
      fullName: editFullName,
      phone: editPhone,
      role: editRole,
    });
    if (!res.success) {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to update account.',
      });
      return;
    }
    setFeedback({
      type: 'success',
      message: `Account "${editUsername.trim().toLowerCase()}" updated and logged to audit trail.`,
    });
    setEditUserId(null);
  };

  const handleConfirmDeleteAccount = async (acc: UserAccount) => {
    setFeedback(null);
    const res = await onDeleteAccount(acc.id);
    if (!res.success) {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to delete account.',
      });
      return;
    }
    setFeedback({
      type: 'success',
      message: `Account "${acc.username}" deleted and logged to audit trail.`,
    });
  };

  const handleConfirmPasswordReset = async (targetId: string) => {
    setFeedback(null);
    const res = await onResetPassword(targetId, resetPasswordVal);
    if (!res.success) {
      setFeedback({
        type: 'error',
        message: res.error || 'Password reset failed.',
      });
      return;
    }
    setFeedback({
      type: 'success',
      message:
        'User password reset verified via server policy and logged to audit trail.',
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
            User Provisioning, Role Management & Security Audit Trail
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Create, edit, deactivate, or delete user accounts, manage company
            roles, and inspect the immutable security audit trail.
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
              {state.rolesList.map((r) => (
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

        {/* Provisioned Accounts Roster with Edit & Delete */}
        <div className="lg:col-span-8 border border-slate-200 rounded bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Provisioned System Accounts ({state.accounts.length})
            </h2>
            <span className="text-xs font-mono text-slate-500">
              Add · Edit · Role · Deactivate · Delete
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
                {state.accounts.map((acc) => {
                  const isEditingThis = editUserId === acc.id;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        {isEditingThis ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              aria-label={`Edit username for ${acc.username}`}
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                              placeholder="Username"
                            />
                            <input
                              type="text"
                              aria-label={`Edit full name for ${acc.username}`}
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                              placeholder="Full Name"
                            />
                            <input
                              type="text"
                              aria-label={`Edit phone for ${acc.username}`}
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                              placeholder="Phone"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="font-mono font-bold text-[#0B192C]">
                              {acc.username}
                            </div>
                            <div className="text-slate-600">
                              <span>{acc.fullName}</span>
                              <span aria-hidden="true"> · </span>
                              <span className="font-mono whitespace-nowrap">
                                {acc.phone}
                              </span>
                            </div>
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditingThis ? (
                          <select
                            aria-label={`Edit role for ${acc.username}`}
                            value={editRole}
                            onChange={(e) =>
                              setEditRole(e.target.value as Role)
                            }
                            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                          >
                            {state.rolesList.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            aria-label={`Change role for ${acc.username}`}
                            value={acc.role}
                            onChange={(e) =>
                              onChangeRole(acc.id, e.target.value as Role)
                            }
                            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                          >
                            {state.rolesList.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        )}
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
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {isEditingThis ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveUserEdit(acc.id)}
                              className="px-2.5 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditUserId(null)}
                              className="px-2.5 py-1 border border-slate-300 rounded text-slate-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditUserId(acc.id);
                                setEditUsername(acc.username);
                                setEditFullName(acc.fullName);
                                setEditPhone(acc.phone);
                                setEditRole(acc.role);
                              }}
                              aria-label={`Edit account ${acc.username}`}
                              className="px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              Edit
                            </button>
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
                              <>
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
                                      ? 'border border-amber-300 text-amber-800 hover:bg-amber-50'
                                      : 'bg-[#0B192C] text-white hover:bg-[#0F2547]'
                                  }`}
                                >
                                  {acc.status === 'active'
                                    ? 'Deactivate'
                                    : 'Reactivate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleConfirmDeleteAccount(acc)
                                  }
                                  aria-label={`Delete account ${acc.username}`}
                                  className="px-2.5 py-1 border border-red-300 text-red-700 hover:bg-red-50 rounded font-semibold cursor-pointer"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {resetTargetId === acc.id && (
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <input
                              type="password"
                              aria-label={`New password for ${acc.username}`}
                              value={resetPasswordVal}
                              onChange={(e) =>
                                setResetPasswordVal(e.target.value)
                              }
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Roles Management (Add, Edit, Delete Roles) */}
      <div className="border border-slate-200 rounded bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-display text-sm font-bold text-[#0B192C] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>System Roles Registry ({state.rolesList.length}) — Add, Edit & Delete Roles</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage RBAC role definitions across the organization.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="text"
              aria-label="New role name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. Tactical K9 Commander"
              className="px-3 py-1.5 border border-slate-300 rounded"
            />
            <button
              type="button"
              onClick={() => {
                if (newRoleName.trim()) {
                  onAddRole(newRoleName.trim());
                  setFeedback({
                    type: 'success',
                    message: `Role "${newRoleName.trim()}" added to system roles registry.`,
                  });
                  setNewRoleName('');
                }
              }}
              className="px-3.5 py-1.5 bg-[#0B192C] text-white font-semibold rounded hover:bg-[#0F2547] cursor-pointer whitespace-nowrap"
            >
              Add Role
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {state.rolesList.map((rName) => (
            <div
              key={rName}
              className="p-3 border border-slate-200 rounded flex items-center justify-between gap-2 bg-slate-50"
            >
              {editingRoleName === rName ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="text"
                    aria-label={`Edit role name ${rName}`}
                    value={editingRoleValue}
                    onChange={(e) => setEditingRoleValue(e.target.value)}
                    className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editingRoleValue.trim()) {
                        onEditRole(rName, editingRoleValue.trim());
                        setFeedback({
                          type: 'success',
                          message: `Role "${rName}" renamed to "${editingRoleValue.trim()}".`,
                        });
                      }
                      setEditingRoleName(null);
                    }}
                    className="px-2 py-1 bg-[#0B192C] text-white rounded cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRoleName(null)}
                    className="px-2 py-1 border border-slate-300 bg-white rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-[#0B192C] truncate">
                    {rName}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoleName(rName);
                        setEditingRoleValue(rName);
                      }}
                      aria-label={`Edit role ${rName}`}
                      className="px-2 py-0.5 border border-slate-300 bg-white rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Edit
                    </button>
                    {rName !== Role.DIRECTOR && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteRole(rName);
                          setFeedback({
                            type: 'success',
                            message: `Role "${rName}" removed from registry.`,
                          });
                        }}
                        aria-label={`Delete role ${rName}`}
                        className="px-2 py-0.5 border border-red-300 bg-white rounded text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
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
              {state.rolesList.map((r) => (
                <tr key={r} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-sans font-semibold text-[#0B192C] whitespace-nowrap">
                    {r}
                  </td>
                  {MATRIX_MODULES.map((m) => {
                    const lvl = getPermissionLevel(
                      r as Role,
                      m.key,
                      state.rbacConfig
                    );
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
            <span>
              Account & Role Management Audit Log ({state.auditLogs.length})
            </span>
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
                    <span className="font-mono">{log.actorUsername}</span> ·{' '}
                    {log.actorRole}
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
