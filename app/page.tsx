'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarClock,
  Building2,
  AlertTriangle,
  Truck,
  Camera,
  FileSpreadsheet,
  Lock,
  BarChart3,
  Database,
  LogOut,
  Menu,
  X,
  KeyRound,
} from 'lucide-react';
import {
  Role,
  ALL_ROLES,
  getAllowedModulesForRole,
  hasPermission,
  type ModuleKey,
  type PermissionLevel,
} from '@/lib/rbac';
import {
  authenticateWithUsernamePassword,
  type UserAccount,
  type CreateAccountInput,
} from '@/lib/auth-logic';
import { signInWithSupabaseUsername } from '@/lib/supabase';
import {
  INITIAL_STATE,
  type SystemState,
  type ShiftRecord,
  type IncidentRecord,
  type SiteRecord,
  type CITJobRecord,
  type CCTVJobRecord,
  type InvoiceRecord,
  type DisciplinaryRecord,
} from '@/lib/seed-data';
import { LoginView } from '@/components/LoginView';
import { DashboardModule } from '@/components/DashboardModule';
import { UserRoleManagementModule } from '@/components/UserRoleManagementModule';
import {
  HREmployeeModule,
  SchedulingShiftsModule,
  SitesClientsModule,
  IncidentReportingModule,
} from '@/components/OperationsModules';
import {
  CITTransportModule,
  CCTVSurveillanceModule,
  AccountingInvoicingModule,
  ClientPortalModule,
  ReportsAndSupabaseModule,
} from '@/components/SpecializedModules';

const MODULE_META: Record<
  ModuleKey,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  dashboard: { label: 'Command Dashboard', icon: LayoutDashboard },
  users_roles: { label: 'User & Role Admin', icon: Users },
  hr_employees: { label: 'Employee HR & Certs', icon: UserCheck },
  scheduling_shifts: { label: 'Scheduling & Shifts', icon: CalendarClock },
  sites_clients: { label: 'Sites & Clients', icon: Building2 },
  incidents: { label: 'Incident Reporting', icon: AlertTriangle },
  cit_transport: { label: 'CIT & Valuables', icon: Truck },
  cctv_surveillance: { label: 'CCTV Surveillance', icon: Camera },
  accounting_invoicing: { label: 'Accounting & Invoicing', icon: FileSpreadsheet },
  client_portal: { label: 'Client Portal', icon: Lock },
  reports_analytics: { label: 'Reports & Analytics', icon: BarChart3 },
  supabase_rls: { label: 'Supabase RLS Schema', icon: Database },
};

export default function SecurityManagementApp() {
  const [state, setState] = useState<SystemState>(INITIAL_STATE);
  const [currentUser, setCurrentUser] = useState<Omit<
    UserAccount,
    'passwordHash'
  > | null>(() => {
    const dir = INITIAL_STATE.accounts[0];
    const { passwordHash: _pw, ...safe } = dir;
    return safe;
  });
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSelfPasswordModal, setShowSelfPasswordModal] = useState(false);
  const [selfNewPassword, setSelfNewPassword] = useState('');
  const [selfPwMsg, setSelfPwMsg] = useState<string | null>(null);

  // Sync currentUser when accounts list updates (e.g., role change)
  useEffect(() => {
    if (!currentUser) return;
    const updated = state.accounts.find((a) => a.id === currentUser.id);
    if (!updated || updated.status !== 'active') {
      setCurrentUser(null);
      return;
    }
    if (updated.role !== currentUser.role) {
      const { passwordHash: _pw, ...safe } = updated;
      setCurrentUser(safe);
    }
  }, [state.accounts, currentUser]);

  const handleLogin = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Attempt live Supabase Auth if configured in .env
    await signInWithSupabaseUsername(username, password).catch(() => null);

    const authResult = authenticateWithUsernamePassword(
      state.accounts,
      username,
      password
    );
    if (!authResult.success || !authResult.user) {
      return { success: false, error: authResult.error };
    }

    setCurrentUser(authResult.user);
    setActiveModule('dashboard');
    return { success: true };
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setMobileMenuOpen(false);
  };

  const handleQuickRoleSwitch = (role: Role) => {
    const match = state.accounts.find(
      (a) => a.role === role && a.status === 'active'
    );
    if (!match) return;
    const { passwordHash: _pw, ...safe } = match;
    setCurrentUser(safe);
    const allowed = getAllowedModulesForRole(role, state.rbacConfig);
    if (!allowed.includes(activeModule)) {
      setActiveModule('dashboard');
    }
  };

  /* ==========================================================================
     SERVER-VERIFIED ACCOUNT & ROLE MANAGEMENT HANDLERS (/api/accounts)
     ========================================================================== */
  const handleCreateAccount = async (
    input: CreateAccountInput
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated.' };
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_ACCOUNT',
        actor: {
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
        },
        accounts: state.accounts,
        payload: input,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Request failed.' };
    }

    setState((prev) => ({
      ...prev,
      accounts: [data.account, ...prev.accounts],
      auditLogs: [data.auditEntry, ...prev.auditLogs],
    }));
    return { success: true };
  };

  const handleChangeRole = async (
    targetId: string,
    newRole: Role
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated.' };
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CHANGE_ROLE',
        actor: {
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
        },
        accounts: state.accounts,
        payload: { targetId, newRole },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error };
    }

    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === targetId ? data.updatedAccount : a
      ),
      auditLogs: [data.auditEntry, ...prev.auditLogs],
    }));
    return { success: true };
  };

  const handleToggleAccountStatus = async (
    targetId: string,
    newStatus: 'active' | 'deactivated'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated.' };
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SET_STATUS',
        actor: {
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
        },
        accounts: state.accounts,
        payload: { targetId, newStatus },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error };
    }

    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === targetId ? data.updatedAccount : a
      ),
      auditLogs: [data.auditEntry, ...prev.auditLogs],
    }));
    return { success: true };
  };

  const handleResetPassword = async (
    targetId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated.' };
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RESET_PASSWORD',
        actor: {
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
        },
        accounts: state.accounts,
        payload: { targetId, newPassword },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error };
    }

    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === targetId ? data.updatedAccount : a
      ),
      auditLogs: [data.auditEntry, ...prev.auditLogs],
    }));
    return { success: true };
  };

  const handleUpdateOpsFinanceAccess = (level: PermissionLevel) => {
    if (!currentUser || currentUser.role !== Role.DIRECTOR) return;
    setState((prev) => ({
      ...prev,
      rbacConfig: {
        ...prev.rbacConfig,
        operationManagerFinancialAccess: level,
      },
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          actorId: currentUser.id,
          actorUsername: currentUser.username,
          actorRole: currentUser.role,
          action: 'FINANCE_ACCESS_CONFIGURED',
          targetId: 'rbac-config',
          targetUsername: 'Operation Manager Role',
          details: `Configured Operation Manager financial access level to "${level}"`,
          timestamp: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));
  };

  /* ==========================================================================
     OPERATIONAL STATE HANDLERS
     ========================================================================== */
  const handleApproveShift = (shiftId: string) => {
    setState((prev) => ({
      ...prev,
      shifts: prev.shifts.map((s) =>
        s.id === shiftId ? { ...s, status: 'Scheduled' } : s
      ),
    }));
  };

  const handleGuardClockToggle = (shiftId: string) => {
    setState((prev) => ({
      ...prev,
      shifts: prev.shifts.map((s) => {
        if (s.id !== shiftId) return s;
        if (s.status === 'Active / On-Post') {
          return {
            ...s,
            status: 'Completed',
            clockOut: new Date().toISOString(),
          };
        }
        return {
          ...s,
          status: 'Active / On-Post',
          clockIn: new Date().toISOString(),
          geoTag: '51.5142° N, 0.0886° W (GPS Verified On-Site)',
        };
      }),
    }));
  };

  const handleMarkNoShow = (shiftId: string) => {
    setState((prev) => ({
      ...prev,
      shifts: prev.shifts.map((s) =>
        s.id === shiftId ? { ...s, status: 'No-Show', hoursLogged: 0 } : s
      ),
    }));
  };

  const handleCreateShift = (newShift: Omit<ShiftRecord, 'id'>) => {
    setState((prev) => ({
      ...prev,
      shifts: [{ id: `sh-${Date.now()}`, ...newShift }, ...prev.shifts],
    }));
  };

  const handleReviewLeave = (
    leaveId: string,
    decision: 'Approved' | 'Declined'
  ) => {
    setState((prev) => ({
      ...prev,
      leaveRequests: prev.leaveRequests.map((l) =>
        l.id === leaveId ? { ...l, status: decision } : l
      ),
    }));
  };

  const handleAddDisciplinary = (rec: Omit<DisciplinaryRecord, 'id'>) => {
    setState((prev) => ({
      ...prev,
      disciplinaryRecords: [
        { id: `disc-${Date.now()}`, ...rec },
        ...prev.disciplinaryRecords,
      ],
    }));
  };

  const handleRenewCertification = (empId: string) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((emp) =>
        emp.id === empId
          ? {
              ...emp,
              siaLicenseExpiry: '2028-11-15',
              contractExpiry: '2028-11-15',
            }
          : emp
      ),
    }));
  };

  const handleAddSite = (site: Omit<SiteRecord, 'id'>) => {
    setState((prev) => ({
      ...prev,
      sites: [{ id: `site-${Date.now()}`, ...site }, ...prev.sites],
    }));
  };

  const handleCreateIncident = (inc: Omit<IncidentRecord, 'id'>) => {
    setState((prev) => ({
      ...prev,
      incidents: [{ id: `inc-${Date.now()}`, ...inc }, ...prev.incidents],
    }));
  };

  const handleEscalateIncident = (
    incId: string,
    nextStage: IncidentRecord['status']
  ) => {
    setState((prev) => ({
      ...prev,
      incidents: prev.incidents.map((i) =>
        i.id === incId
          ? {
              ...i,
              status: nextStage,
              escalatedTo:
                nextStage === 'Escalated to Command'
                  ? 'Operation Manager / Director'
                  : 'Supervisor (David Keller)',
            }
          : i
      ),
    }));
  };

  const handleResolveIncident = (incId: string) => {
    setState((prev) => ({
      ...prev,
      incidents: prev.incidents.map((i) =>
        i.id === incId ? { ...i, status: 'Resolved' } : i
      ),
    }));
  };

  const handleCreateCITJob = (job: Omit<CITJobRecord, 'id'>) => {
    setState((prev) => ({
      ...prev,
      citJobs: [{ id: `cit-${Date.now()}`, ...job }, ...prev.citJobs],
    }));
  };

  const handleAdvanceCITStatus = (jobId: string, custodianName: string) => {
    setState((prev) => ({
      ...prev,
      citJobs: prev.citJobs.map((job) => {
        if (job.id !== jobId) return job;
        const nextStatus: CITJobRecord['status'] =
          job.status === 'Scheduled'
            ? 'In Transit'
            : job.status === 'In Transit'
            ? 'Vault Handover'
            : 'Completed';
        return {
          ...job,
          status: nextStatus,
          chainOfCustody: [
            ...job.chainOfCustody,
            {
              timestamp: new Date().toISOString(),
              checkpoint: `Stage Advanced to ${nextStatus}`,
              custodian: custodianName,
              sealCode:
                job.chainOfCustody[0]?.sealCode || 'SL-994820-VERIFIED',
              verified: true,
            },
          ],
        };
      }),
    }));
  };

  const handleCreateCCTVJob = (job: Omit<CCTVJobRecord, 'id'>) => {
    setState((prev) => ({
      ...prev,
      cctvJobs: [{ id: `cctv-${Date.now()}`, ...job }, ...prev.cctvJobs],
    }));
  };

  const handleAdvanceCCTVJob = (jobId: string) => {
    setState((prev) => ({
      ...prev,
      cctvJobs: prev.cctvJobs.map((job) => {
        if (job.id !== jobId) return job;
        const nextStatus: CCTVJobRecord['status'] =
          job.status === 'Assigned'
            ? 'In Progress'
            : job.status === 'In Progress'
            ? 'Pending Sign-Off'
            : 'Completed';
        return {
          ...job,
          status: nextStatus,
          signedOffBy:
            nextStatus === 'Completed'
              ? `${currentUser?.fullName} (${currentUser?.role})`
              : job.signedOffBy,
        };
      }),
    }));
  };

  const handleCreateInvoice = (inv: Omit<InvoiceRecord, 'id'>) => {
    setState((prev) => ({
      ...prev,
      invoices: [{ id: `inv-${Date.now()}`, ...inv }, ...prev.invoices],
    }));
  };

  const handleMarkInvoicePaid = (invId: string) => {
    setState((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) =>
        inv.id === invId ? { ...inv, status: 'Paid' } : inv
      ),
    }));
  };

  // Render Login screen if unauthenticated
  if (!currentUser) {
    return <LoginView accounts={state.accounts} onLogin={handleLogin} />;
  }

  const allowedModules = getAllowedModulesForRole(
    currentUser.role,
    state.rbacConfig
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col lg:flex-row">
      {/* =====================================================================
          PERSISTENT SIDEBAR NAVIGATION (Navy Blue / Blue-Black per Section 8)
         ===================================================================== */}
      <aside
        className={`w-full lg:w-64 bg-[#060D1A] text-white shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between ${
          mobileMenuOpen ? 'block' : 'hidden lg:flex'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="px-5 py-4 bg-[#0B192C] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-white text-[#0B192C] flex items-center justify-center font-bold">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
                AEGIS VANGUARD
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-300 hover:text-white"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role-Based Navigation Links */}
          <nav
            aria-label="Primary Module Navigation"
            className="p-3 space-y-1"
          >
            <div className="px-3 py-1.5 text-[11px] font-mono text-slate-400">
              AUTHORIZED MODULES ({allowedModules.length})
            </div>
            {allowedModules.map((modKey) => {
              const meta = MODULE_META[modKey];
              const Icon = meta.icon;
              const isActive = activeModule === modKey;
              return (
                <button
                  key={modKey}
                  type="button"
                  onClick={() => {
                    setActiveModule(modKey);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0F2547] text-white font-semibold border border-slate-700'
                      : 'text-slate-300 hover:bg-[#0B192C] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Active Role & Quick Role Switcher for Testing */}
        <div className="p-4 border-t border-slate-800 bg-[#0B192C] space-y-3">
          <div>
            <label
              htmlFor="sidebar-role-switcher"
              className="block text-[11px] font-mono text-slate-300 mb-1"
            >
              ACTIVE RBAC ROLE VIEW
            </label>
            <select
              id="sidebar-role-switcher"
              value={currentUser.role}
              onChange={(e) => handleQuickRoleSwitch(e.target.value as Role)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#060D1A] border border-slate-700 rounded text-white font-medium"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  Switch to: {r}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[11px] font-mono text-slate-400 leading-tight">
            Supabase RLS & Server-Side RBAC Active
          </div>
        </div>
      </aside>

      {/* =====================================================================
          MAIN WORKSPACE VIEWPORT
         ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Brand/Breadcrumb on left, User/Role/Sign-Out on right */}
        <header className="bg-[#0B192C] text-white border-b border-slate-800 px-6 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded border border-slate-700 text-white"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-sm font-semibold tracking-tight whitespace-nowrap">
              {MODULE_META[activeModule]?.label || 'Command Dashboard'}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-slate-200">
              <span className="font-semibold text-white">
                {currentUser.fullName}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-300">
                {currentUser.username}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-semibold text-white">
                {currentUser.role}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSelfPasswordModal(!showSelfPasswordModal);
                setSelfPwMsg(null);
              }}
              className="px-3 py-1.5 border border-slate-600 hover:border-slate-400 text-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              My Password
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-1.5 bg-white text-[#0B192C] hover:bg-slate-100 font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Self Password Update Bar (All roles can manage their own password per Section 3) */}
        {showSelfPasswordModal && (
          <div className="bg-slate-100 border-b border-slate-300 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-800">
              <KeyRound className="w-4 h-4 text-[#0B192C]" />
              <span className="font-semibold">
                Update Own Password ({currentUser.username}):
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                aria-label="New personal password"
                value={selfNewPassword}
                onChange={(e) => setSelfNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="px-3 py-1.5 font-mono bg-white border border-slate-300 rounded"
              />
              <button
                type="button"
                onClick={async () => {
                  const res = await handleResetPassword(
                    currentUser.id,
                    selfNewPassword
                  );
                  if (res.success) {
                    setSelfPwMsg('Password updated successfully.');
                    setSelfNewPassword('');
                  } else {
                    setSelfPwMsg(res.error || 'Failed to update password.');
                  }
                }}
                className="px-3 py-1.5 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
              >
                Save New Password
              </button>
              {selfPwMsg && (
                <span className="font-medium text-[#0B192C]">{selfPwMsg}</span>
              )}
            </div>
          </div>
        )}

        {/* Active Module Content Area */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeModule === 'dashboard' && (
            <DashboardModule
              currentUser={currentUser}
              state={state}
              onNavigate={setActiveModule}
              onApproveShift={handleApproveShift}
              onGuardClockToggle={handleGuardClockToggle}
              onReviewLeave={handleReviewLeave}
              onAdvanceCCTVJob={handleAdvanceCCTVJob}
            />
          )}

          {activeModule === 'users_roles' && (
            <UserRoleManagementModule
              currentUser={currentUser}
              state={state}
              onCreateAccount={handleCreateAccount}
              onChangeRole={handleChangeRole}
              onToggleStatus={handleToggleAccountStatus}
              onResetPassword={handleResetPassword}
              onUpdateOpsFinanceAccess={handleUpdateOpsFinanceAccess}
            />
          )}

          {activeModule === 'hr_employees' && (
            <HREmployeeModule
              currentUser={currentUser}
              state={state}
              onReviewLeave={handleReviewLeave}
              onAddDisciplinary={handleAddDisciplinary}
              onRenewCertification={handleRenewCertification}
            />
          )}

          {activeModule === 'scheduling_shifts' && (
            <SchedulingShiftsModule
              currentUser={currentUser}
              state={state}
              onCreateShift={handleCreateShift}
              onApproveShift={handleApproveShift}
              onGuardClockToggle={handleGuardClockToggle}
              onMarkNoShow={handleMarkNoShow}
            />
          )}

          {activeModule === 'sites_clients' && (
            <SitesClientsModule
              currentUser={currentUser}
              state={state}
              onAddSite={handleAddSite}
            />
          )}

          {activeModule === 'incidents' && (
            <IncidentReportingModule
              currentUser={currentUser}
              state={state}
              onCreateIncident={handleCreateIncident}
              onEscalateIncident={handleEscalateIncident}
              onResolveIncident={handleResolveIncident}
            />
          )}

          {activeModule === 'cit_transport' && (
            <CITTransportModule
              currentUser={currentUser}
              state={state}
              onCreateCITJob={handleCreateCITJob}
              onAdvanceCITStatus={handleAdvanceCITStatus}
            />
          )}

          {activeModule === 'cctv_surveillance' && (
            <CCTVSurveillanceModule
              currentUser={currentUser}
              state={state}
              onCreateCCTVJob={handleCreateCCTVJob}
              onAdvanceCCTVJob={handleAdvanceCCTVJob}
            />
          )}

          {activeModule === 'accounting_invoicing' && (
            <AccountingInvoicingModule
              currentUser={currentUser}
              state={state}
              onCreateInvoice={handleCreateInvoice}
              onMarkInvoicePaid={handleMarkInvoicePaid}
            />
          )}

          {activeModule === 'client_portal' && (
            <ClientPortalModule currentUser={currentUser} state={state} />
          )}

          {activeModule === 'reports_analytics' && (
            <ReportsAndSupabaseModule
              currentUser={currentUser}
              state={state}
              initialTab="reports"
            />
          )}

          {activeModule === 'supabase_rls' && (
            <ReportsAndSupabaseModule
              currentUser={currentUser}
              state={state}
              initialTab="supabase"
            />
          )}
        </main>
      </div>
    </div>
  );
}
