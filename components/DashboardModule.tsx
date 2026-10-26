'use client';

import React, { useState } from 'react';
import {
  Users,
  AlertTriangle,
  MapPin,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import {
  Role,
  type ModuleKey,
  filterSitesByRLS,
  filterShiftsByRLS,
  filterIncidentsByRLS,
  filterInvoicesByRLS,
  filterCCTVJobsByRLS,
} from '@/lib/rbac';
import type { UserAccount } from '@/lib/auth-logic';
import type { SystemState, SiteRecord } from '@/lib/seed-data';

interface DashboardModuleProps {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onNavigate: (module: ModuleKey) => void;
  onApproveShift: (shiftId: string) => void;
  onGuardClockToggle: (shiftId: string) => void;
  onReviewLeave: (leaveId: string, decision: 'Approved' | 'Declined') => void;
  onAdvanceCCTVJob: (jobId: string) => void;
  onDeleteSite?: (siteId: string) => void;
  onUpdateSite?: (siteId: string, patch: Partial<SiteRecord>) => void;
  onAddServiceLine?: (name: string) => void;
  onUpdateServiceLine?: (oldName: string, newName: string) => void;
  onDeleteServiceLine?: (name: string) => void;
}

export function DashboardModule({
  currentUser,
  state,
  onNavigate,
  onApproveShift,
  onGuardClockToggle,
  onReviewLeave,
  onAdvanceCCTVJob,
  onDeleteSite,
  onUpdateSite,
  onAddServiceLine,
  onUpdateServiceLine,
  onDeleteServiceLine,
}: DashboardModuleProps) {
  const isDirector = currentUser.role === Role.DIRECTOR;

  const [newServiceLine, setNewServiceLine] = useState('');
  const [editingServiceLine, setEditingServiceLine] = useState<string | null>(
    null
  );
  const [editingServiceLineVal, setEditingServiceLineVal] = useState('');

  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteAddress, setEditSiteAddress] = useState('');
  const [editSiteService, setEditSiteService] = useState('');

  const rlsCtx = {
    userId: currentUser.id,
    role: currentUser.role,
    clientId: currentUser.clientId,
    assignedSiteIds: currentUser.assignedSiteIds,
  };

  const visibleSites = filterSitesByRLS(state.sites, rlsCtx);
  const visibleShifts = filterShiftsByRLS(state.shifts, rlsCtx);
  const visibleIncidents = filterIncidentsByRLS(state.incidents, rlsCtx);
  const visibleInvoices = filterInvoicesByRLS(
    state.invoices,
    rlsCtx,
    state.rbacConfig
  );
  const visibleCCTVJobs = filterCCTVJobsByRLS(state.cctvJobs, rlsCtx);

  const openIncidents = visibleIncidents.filter((i) => i.status !== 'Resolved');
  const activeCITJobs = state.citJobs.filter((j) => j.status !== 'Completed');
  const totalRevenue = state.invoices
    .filter((i) => i.status === 'Paid' || i.status === 'Issued')
    .reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-8">
      {/* Top Role Context Header — Displays ONLY Username on Dashboard */}
      <div className="border-b border-slate-200 pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500">
            ROLE-AWARE COMMAND DASHBOARD · {currentUser.role.toUpperCase()} VIEW
          </p>
          <h1
            data-testid="dashboard-username-heading"
            className="font-display text-2xl font-bold text-[#0B192C] mt-1 font-mono"
          >
            {currentUser.username}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Active RLS Scope:{' '}
            <span className="font-medium text-slate-900">
              {currentUser.role}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(currentUser.role === Role.DIRECTOR ||
            currentUser.role === Role.OPERATION_MANAGER) && (
            <button
              type="button"
              onClick={() => onNavigate('users_roles')}
              className="px-4 py-2 bg-[#0B192C] hover:bg-[#0F2547] text-white text-xs font-semibold rounded transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Users & Roles</span>
            </button>
          )}
          {currentUser.role === Role.GUARD && (
            <button
              type="button"
              onClick={() => onNavigate('incidents')}
              className="px-4 py-2 bg-[#0B192C] hover:bg-[#0F2547] text-white text-xs font-semibold rounded transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Submit Post Incident Report</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          1. DIRECTOR & OPERATION MANAGER DASHBOARD (Section 6.1)
         ===================================================================== */}
      {(currentUser.role === Role.DIRECTOR ||
        currentUser.role === Role.OPERATION_MANAGER) && (
        <div className="space-y-8">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Active Contracted Sites</p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                {state.sites.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Across {state.serviceLines.length} security service lines
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Open Security Incidents</p>
              <p className="text-2xl font-bold text-red-700 font-mono tabular-nums mt-1">
                {openIncidents.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {openIncidents.filter((i) => i.severity === 'Critical').length}{' '}
                Critical ·{' '}
                {
                  openIncidents.filter(
                    (i) => i.status === 'Escalated to Command'
                  ).length
                }{' '}
                Escalated
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">
                Active / Scheduled CIT Convoy Jobs
              </p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                {activeCITJobs.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Armored Cash-in-Transit & Bullion
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">
                Billing & Revenue Snapshot
              </p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                £{totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {state.accounts.filter((a) => a.status === 'active').length}{' '}
                Active Accounts Provisioned
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Active Sites & Service Coverage with Direct Edit/Delete for Director */}
            <div className="lg:col-span-7 border border-slate-200 rounded bg-white">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#0B192C]">
                  Active Contracted Sites & Service Coverage ({state.sites.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('sites_clients')}
                  className="text-xs font-semibold text-[#0B192C] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Add / Manage All Sites</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-slate-200">
                {state.sites.map((site) => {
                  const isEditing = editingSiteId === site.id;
                  return (
                    <div
                      key={site.id}
                      className="px-5 py-3.5 hover:bg-slate-50 space-y-2"
                    >
                      {isEditing ? (
                        <div className="space-y-2 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              aria-label="Edit site name"
                              value={editSiteName}
                              onChange={(e) => setEditSiteName(e.target.value)}
                              className="px-2.5 py-1.5 border border-slate-300 rounded"
                            />
                            <select
                              aria-label="Edit site service type"
                              value={editSiteService}
                              onChange={(e) =>
                                setEditSiteService(e.target.value)
                              }
                              className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            >
                              {state.serviceLines.map((sl) => (
                                <option key={sl} value={sl}>
                                  {sl}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            aria-label="Edit site address"
                            value={editSiteAddress}
                            onChange={(e) => setEditSiteAddress(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateSite && editSiteName.trim()) {
                                  onUpdateSite(site.id, {
                                    siteName: editSiteName.trim(),
                                    address: editSiteAddress.trim(),
                                    serviceType: editSiteService,
                                  });
                                }
                                setEditingSiteId(null);
                              }}
                              className="px-3 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                            >
                              Save Site
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSiteId(null)}
                              className="px-3 py-1 border border-slate-300 text-slate-700 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {site.siteName}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {site.serviceType} · {site.address}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right text-xs font-mono tabular-nums text-slate-600">
                              <div>
                                Risk:{' '}
                                <strong className="text-slate-900">
                                  {site.riskLevel}
                                </strong>{' '}
                                · Guards: {site.requiredGuards}
                              </div>
                              <div className="text-slate-500">
                                CCTV: {site.cctvStatus} ({site.activeCameras}{' '}
                                cams)
                              </div>
                            </div>
                            {isDirector && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSiteId(site.id);
                                    setEditSiteName(site.siteName);
                                    setEditSiteAddress(site.address);
                                    setEditSiteService(site.serviceType);
                                  }}
                                  aria-label={`Edit site ${site.siteName}`}
                                  className="px-2 py-1 text-xs border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteSite?.(site.id)}
                                  aria-label={`Delete site ${site.siteName}`}
                                  className="px-2 py-1 text-xs border border-red-300 rounded text-red-700 hover:bg-red-50 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Company Service Lines Management + Open Incidents + CIT Jobs */}
            <div className="lg:col-span-5 space-y-6">
              {isDirector && (
                <div className="border border-slate-200 rounded bg-white p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h2 className="font-display text-sm font-bold text-[#0B192C]">
                      Company Security Service Lines ({state.serviceLines.length})
                    </h2>
                    <span className="text-[11px] font-mono text-slate-500">
                      Director Control
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      aria-label="New company service line"
                      value={newServiceLine}
                      onChange={(e) => setNewServiceLine(e.target.value)}
                      placeholder="Add new service line (e.g. K9 Patrol)"
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newServiceLine.trim() && onAddServiceLine) {
                          onAddServiceLine(newServiceLine.trim());
                          setNewServiceLine('');
                        }
                      }}
                      className="px-3 py-1.5 bg-[#0B192C] text-white font-semibold rounded hover:bg-[#0F2547] cursor-pointer whitespace-nowrap"
                    >
                      Add Service
                    </button>
                  </div>
                  <div className="divide-y divide-slate-200 max-h-52 overflow-y-auto text-xs">
                    {state.serviceLines.map((sl) => (
                      <div
                        key={sl}
                        className="py-2 flex items-center justify-between gap-2"
                      >
                        {editingServiceLine === sl ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              aria-label={`Edit service line ${sl}`}
                              value={editingServiceLineVal}
                              onChange={(e) =>
                                setEditingServiceLineVal(e.target.value)
                              }
                              className="flex-1 px-2 py-1 border border-slate-300 rounded"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  editingServiceLineVal.trim() &&
                                  onUpdateServiceLine
                                ) {
                                  onUpdateServiceLine(
                                    sl,
                                    editingServiceLineVal.trim()
                                  );
                                }
                                setEditingServiceLine(null);
                              }}
                              className="px-2 py-1 bg-[#0B192C] text-white rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingServiceLine(null)}
                              className="px-2 py-1 border border-slate-300 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium text-slate-900">
                              {sl}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingServiceLine(sl);
                                  setEditingServiceLineVal(sl);
                                }}
                                className="px-2 py-0.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteServiceLine?.(sl)}
                                className="px-2 py-0.5 border border-red-300 rounded text-red-700 hover:bg-red-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded bg-white">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-[#0B192C]">
                    Open Incidents & Escalations
                  </h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('incidents')}
                    className="text-xs font-semibold text-[#0B192C] hover:underline cursor-pointer"
                  >
                    Manage Incidents
                  </button>
                </div>
                <div className="divide-y divide-slate-200">
                  {openIncidents.map((inc) => (
                    <div key={inc.id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-red-700">
                          {inc.severity} Severity · {inc.type}
                        </span>
                        <span className="font-mono">{inc.status}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                        {inc.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-slate-200 rounded bg-white">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-[#0B192C]">
                    Upcoming CIT & Valuable Transport
                  </h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('cit_transport')}
                    className="text-xs font-semibold text-[#0B192C] hover:underline cursor-pointer"
                  >
                    Manage CIT Jobs
                  </button>
                </div>
                <div className="divide-y divide-slate-200">
                  {state.citJobs.map((job) => (
                    <div key={job.id} className="px-5 py-3.5 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-[#0B192C]">
                          {job.jobCode}
                        </span>
                        <span className="text-slate-600">{job.status}</span>
                      </div>
                      <p className="text-slate-700 mt-1">
                        {job.pickup} → {job.dropoff}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        {job.vehicle} · {job.valueCategory}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. SUPERVISOR DASHBOARD (Section 6.2)
         ===================================================================== */}
      {currentUser.role === Role.SUPERVISOR && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Supervised Sites</p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                {visibleSites.length}
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Pending Shift Approvals</p>
              <p className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
                {
                  visibleShifts.filter((s) => s.status === 'Pending Approval')
                    .length
                }
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Open Site Incidents</p>
              <p className="text-2xl font-bold text-red-700 font-mono tabular-nums mt-1">
                {openIncidents.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded bg-white">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#0B192C]">
                  Today&apos;s Site Rosters & Pending Shift Approvals
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('scheduling_shifts')}
                  className="text-xs font-semibold text-[#0B192C] hover:underline cursor-pointer"
                >
                  Full Roster
                </button>
              </div>
              <div className="divide-y divide-slate-200">
                {visibleShifts.map((sh) => {
                  const site = state.sites.find((s) => s.id === sh.siteId);
                  return (
                    <div
                      key={sh.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {sh.guardName} · {site?.siteName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {sh.postAssignment} · Status: {sh.status}
                        </p>
                      </div>
                      {sh.status === 'Pending Approval' ? (
                        <button
                          type="button"
                          onClick={() => onApproveShift(sh.id)}
                          className="px-3 py-1.5 bg-[#0B192C] text-white text-xs font-semibold rounded hover:bg-[#0F2547] cursor-pointer whitespace-nowrap"
                        >
                          Approve Shift
                        </button>
                      ) : (
                        <span className="text-xs font-mono text-slate-600">
                          {sh.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-slate-200 rounded bg-white">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#0B192C]">
                  Recent Incidents at Assigned Sites
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('incidents')}
                  className="text-xs font-semibold text-[#0B192C] hover:underline cursor-pointer"
                >
                  Review & Escalate
                </button>
              </div>
              <div className="divide-y divide-slate-200">
                {visibleIncidents.map((inc) => (
                  <div key={inc.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">
                        {inc.type} ({inc.severity})
                      </span>
                      <span className="font-mono text-slate-500">
                        {inc.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {inc.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. ACCOUNTANT DASHBOARD (Section 6.3)
         ===================================================================== */}
      {currentUser.role === Role.ACCOUNTANT && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">
                Gross Billed Revenue vs Target (£220k)
              </p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                £{totalRevenue.toLocaleString()} (88.4%)
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">
                Outstanding / Overdue Invoices
              </p>
              <p className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
                £
                {state.invoices
                  .filter(
                    (i) => i.status === 'Issued' || i.status === 'Overdue'
                  )
                  .reduce((s, i) => s + i.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">
                Logged Operational Expenses
              </p>
              <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                £{totalExpenses.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded bg-white">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#0B192C]">
                  Client Invoices
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('accounting_invoicing')}
                  className="text-xs font-semibold text-[#0B192C] hover:underline cursor-pointer"
                >
                  Open Accounting Ledger
                </button>
              </div>
              <div className="divide-y divide-slate-200">
                {state.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="px-5 py-3.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-mono font-bold text-slate-900">
                        {inv.invoiceNumber} · {inv.serviceLine}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        {inv.billingPeriod}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="font-bold text-slate-900">
                        £{inv.amount.toLocaleString()}
                      </p>
                      <p className="text-slate-500">{inv.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 rounded bg-white">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold text-[#0B192C]">
                  Recent Operational Expenses
                </h2>
              </div>
              <div className="divide-y divide-slate-200">
                {state.expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="px-5 py-3.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {exp.category}
                      </p>
                      <p className="text-slate-500 mt-0.5">{exp.description}</p>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      £{exp.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. HR MANAGER DASHBOARD (Section 6.4)
         ===================================================================== */}
      {currentUser.role === Role.HR_MANAGER && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">
                Total Active Personnel Headcount
              </p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                {state.employees.length}
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Pending Leave Requests</p>
              <p className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
                {
                  state.leaveRequests.filter((l) => l.status === 'Pending')
                    .length
                }
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">
                Expiring SIA Licenses / Contracts (30d)
              </p>
              <p className="text-2xl font-bold text-red-700 font-mono tabular-nums mt-1">
                3
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded bg-white">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#0B192C]">
                  Pending Leave Approvals
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('hr_employees')}
                  className="text-xs font-semibold text-[#0B192C] hover:underline cursor-pointer"
                >
                  Open HR Module
                </button>
              </div>
              <div className="divide-y divide-slate-200">
                {state.leaveRequests.map((lv) => (
                  <div
                    key={lv.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="text-xs">
                      <p className="font-semibold text-slate-900">
                        {lv.employeeName} · {lv.leaveType}
                      </p>
                      <p className="text-slate-500 font-mono mt-0.5">
                        {lv.startDate} to {lv.endDate} · Status: {lv.status}
                      </p>
                      <p className="text-slate-600 mt-1">{lv.reason}</p>
                    </div>
                    {lv.status === 'Pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onReviewLeave(lv.id, 'Approved')}
                          className="px-3 py-1.5 bg-[#0B192C] text-white text-xs font-semibold rounded hover:bg-[#0F2547] cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onReviewLeave(lv.id, 'Declined')}
                          className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-100 cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 rounded bg-white">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold text-[#0B192C]">
                  Certification & Contract Expiry Alerts
                </h2>
              </div>
              <div className="divide-y divide-slate-200">
                {state.employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="px-5 py-3.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {emp.fullName} ({emp.badgeNumber})
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        {emp.certifications.join(' · ')}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="text-slate-800">
                        SIA Exp: {emp.siaLicenseExpiry}
                      </p>
                      <p className="text-slate-500">
                        Contract: {emp.contractExpiry}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. GUARD SELF-SERVICE DASHBOARD (Section 6.5)
         ===================================================================== */}
      {currentUser.role === Role.GUARD && (
        <div className="space-y-6">
          <div className="border border-slate-200 rounded bg-white p-6">
            <h2 className="font-display text-base font-bold text-[#0B192C]">
              My Assigned Shifts & GPS Clock-In / Clock-Out
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Clock in upon arrival at your assigned post. Geo-coordinates are
              automatically logged for supervisor and payroll verification.
            </p>
            <div className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
              {visibleShifts.map((sh) => {
                const site = state.sites.find((s) => s.id === sh.siteId);
                return (
                  <div
                    key={sh.id}
                    className="py-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {site?.siteName || sh.siteId}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Post: {sh.postAssignment} · Status:{' '}
                        <strong>{sh.status}</strong>
                      </p>
                      <p className="text-xs font-mono text-slate-500 mt-1">
                        {new Date(sh.startTime).toUTCString().slice(0, 22)} →{' '}
                        {new Date(sh.endTime).toUTCString().slice(0, 22)} UTC
                      </p>
                      {sh.geoTag && (
                        <p className="text-xs font-mono text-emerald-700 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{sh.geoTag}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {sh.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => onGuardClockToggle(sh.id)}
                          className="px-4 py-2 bg-[#0B192C] hover:bg-[#0F2547] text-white text-xs font-semibold rounded cursor-pointer whitespace-nowrap"
                        >
                          {sh.status === 'Active / On-Post'
                            ? 'Clock Out & Complete Shift'
                            : 'Clock In (Log GPS)'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. CCTV TECHNICIAN DASHBOARD (Section 6.6)
         ===================================================================== */}
      {currentUser.role === Role.CCTV_TECHNICIAN && (
        <div className="space-y-6">
          <div className="border border-slate-200 rounded bg-white">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#0B192C]">
                Assigned CCTV Installation & Surveillance Maintenance Jobs
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('cctv_surveillance')}
                className="text-xs font-semibold text-[#0B192C] hover:underline cursor-pointer"
              >
                Open CCTV Console
              </button>
            </div>
            <div className="divide-y divide-slate-200">
              {visibleCCTVJobs.map((job) => {
                const site = state.sites.find((s) => s.id === job.siteId);
                return (
                  <div
                    key={job.id}
                    className="px-5 py-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="text-xs">
                      <p className="text-sm font-bold text-slate-900">
                        {job.jobCode} · {site?.siteName}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        {job.jobType} · Scheduled:{' '}
                        <span className="font-mono">{job.scheduledDate}</span> ·
                        Status: <strong>{job.status}</strong>
                      </p>
                      <p className="text-slate-500 mt-1">
                        Equipment Checklist: {job.equipmentUsed.join(', ')}
                      </p>
                    </div>
                    {job.status !== 'Completed' && (
                      <button
                        type="button"
                        onClick={() => onAdvanceCCTVJob(job.id)}
                        className="px-3.5 py-2 bg-[#0B192C] text-white text-xs font-semibold rounded hover:bg-[#0F2547] cursor-pointer whitespace-nowrap"
                      >
                        Advance Job Status
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          7. CLIENT RESTRICTED DASHBOARD (Section 6.7)
         ===================================================================== */}
      {currentUser.role === Role.CLIENT && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Your Contracted Sites</p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                {visibleSites.length}
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Active Guard Coverage</p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                {visibleSites.reduce((sum, s) => sum + s.requiredGuards, 0)}{' '}
                Guards
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Site Incident Advisories</p>
              <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                {visibleIncidents.length}
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Your Invoices</p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                {visibleInvoices.length}
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded bg-white">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#0B192C]">
                Your Contracted Sites & Live CCTV Telemetry Status
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('client_portal')}
                className="text-xs font-semibold text-[#0B192C] hover:underline cursor-pointer"
              >
                Open Full Client Portal
              </button>
            </div>
            <div className="divide-y divide-slate-200">
              {visibleSites.map((site) => (
                <div
                  key={site.id}
                  className="px-5 py-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {site.siteName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {site.serviceType} · {site.address}
                    </p>
                  </div>
                  <div className="text-right text-xs font-mono">
                    <p className="text-slate-900">
                      Assigned Coverage: {site.requiredGuards} Guards On-Roster
                    </p>
                    <p className="text-slate-500">
                      CCTV Status: {site.cctvStatus} ({site.activeCameras}{' '}
                      Active Feeds)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
