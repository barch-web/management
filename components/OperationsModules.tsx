'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  Role,
  ServiceLine,
  ALL_SERVICE_LINES,
  hasPermission,
  filterShiftsByRLS,
  filterIncidentsByRLS,
} from '@/lib/rbac';
import {
  validateShiftTimes,
  validateIncidentReport,
  type UserAccount,
} from '@/lib/auth-logic';
import type {
  SystemState,
  ShiftRecord,
  IncidentRecord,
  SiteRecord,
  ClientRecord,
  EmployeeRecord,
  DisciplinaryRecord,
} from '@/lib/seed-data';

/* ============================================================================
   5.3 EMPLOYEE MANAGEMENT (HR) MODULE
   ============================================================================ */
export function HREmployeeModule({
  currentUser,
  state,
  onReviewLeave,
  onAddDisciplinary,
  onDeleteDisciplinary,
  onRenewCertification,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onReviewLeave: (leaveId: string, decision: 'Approved' | 'Declined') => void;
  onAddDisciplinary: (rec: Omit<DisciplinaryRecord, 'id'>) => void;
  onDeleteDisciplinary?: (discId: string) => void;
  onRenewCertification: (empId: string) => void;
  onAddEmployee?: (emp: Omit<EmployeeRecord, 'id'>) => void;
  onUpdateEmployee?: (empId: string, patch: Partial<EmployeeRecord>) => void;
  onDeleteEmployee?: (empId: string) => void;
}) {
  const canEditHR = hasPermission(currentUser.role, 'hr_employees', 'edit');
  const isDirector = currentUser.role === Role.DIRECTOR;

  const [empId, setEmpId] = useState(state.employees[0]?.id || 'emp-1');
  const [category, setCategory] = useState<DisciplinaryRecord['category']>(
    'Commendation / Audit Note'
  );
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  // Add Employee State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpBadge, setNewEmpBadge] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<Role>(Role.GUARD);
  const [newEmpSiteId, setNewEmpSiteId] = useState(
    state.sites[0]?.id || 'site-1'
  );
  const [newEmpRate, setNewEmpRate] = useState('22.50');

  // Inline Edit Employee State
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpBadge, setEditEmpBadge] = useState('');
  const [editEmpRole, setEditEmpRole] = useState<Role>(Role.GUARD);
  const [editEmpSiteId, setEditEmpSiteId] = useState('');

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !onAddEmployee) return;
    onAddEmployee({
      userId: `usr-emp-${Date.now()}`,
      fullName: newEmpName.trim(),
      badgeNumber:
        newEmpBadge.trim() || `AV-${Math.floor(1000 + Math.random() * 8999)}`,
      role: newEmpRole,
      assignedSiteId: newEmpSiteId,
      startDate: '2026-10-25',
      contractExpiry: '2028-10-25',
      siaLicenseExpiry: '2028-10-25',
      certifications: ['SIA Frontline License', 'First Aid Trauma Level 3'],
      clearanceLevel: 'BS7858 Vetted · Tier-2 Operational',
      hourlyRate: Number(newEmpRate) || 21.0,
    });
    setNewEmpName('');
    setNewEmpBadge('');
    setMsg(`Added employee dossier for ${newEmpName.trim()}.`);
  };

  const handleSaveEmployeeEdit = (id: string) => {
    if (!editEmpName.trim() || !onUpdateEmployee) return;
    onUpdateEmployee(id, {
      fullName: editEmpName.trim(),
      badgeNumber: editEmpBadge.trim(),
      role: editEmpRole,
      assignedSiteId: editEmpSiteId,
    });
    setEditingEmpId(null);
    setMsg(`Updated employee dossier for ${editEmpName.trim()}.`);
  };

  const handleCreateDisc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !actionTaken.trim()) return;
    const emp = state.employees.find((x) => x.id === empId);
    onAddDisciplinary({
      employeeId: empId,
      employeeName: emp?.fullName || 'Personnel',
      date: '2026-10-25',
      category,
      description: description.trim(),
      actionTaken: actionTaken.trim(),
    });
    setDescription('');
    setActionTaken('');
    setMsg('Personnel disciplinary/commendation record logged.');
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-mono text-slate-500">
          HUMAN RESOURCE MANAGEMENT · PERSONNEL DOSSIERS & COMPLIANCE
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
          Employee Profiles, Certifications, Leave & Disciplinary Records
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Note per Section 4.5: HR Managers and Directors manage personnel
          records, contracts, and certifications, while system login creation
          and role assignment remain restricted to Director and Operation
          Manager.
        </p>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{msg}</span>
        </div>
      )}

      {/* Add New Employee Dossier (Director / HR Manager) */}
      {canEditHR && onAddEmployee && (
        <form
          onSubmit={handleCreateEmployee}
          className="border border-slate-200 rounded bg-white p-5 space-y-3 text-xs"
        >
          <h2 className="font-display text-sm font-bold text-[#0B192C]">
            Add New Employee Personnel Dossier
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label
                htmlFor="new-emp-name"
                className="block font-semibold text-slate-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="new-emp-name"
                type="text"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                placeholder="e.g. Nathan Cross"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="new-emp-badge"
                className="block font-semibold text-slate-700 mb-1"
              >
                Badge Number
              </label>
              <input
                id="new-emp-badge"
                type="text"
                value={newEmpBadge}
                onChange={(e) => setNewEmpBadge(e.target.value)}
                placeholder="e.g. AV-0901"
                className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="new-emp-role"
                className="block font-semibold text-slate-700 mb-1"
              >
                Operational Role
              </label>
              <select
                id="new-emp-role"
                value={newEmpRole}
                onChange={(e) => setNewEmpRole(e.target.value as Role)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                {(state.rolesList || []).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="new-emp-site"
                className="block font-semibold text-slate-700 mb-1"
              >
                Assigned Site
              </label>
              <select
                id="new-emp-site"
                value={newEmpSiteId}
                onChange={(e) => setNewEmpSiteId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                {state.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label
                  htmlFor="new-emp-rate"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Rate (£/hr)
                </label>
                <input
                  id="new-emp-rate"
                  type="number"
                  step="0.5"
                  value={newEmpRate}
                  onChange={(e) => setNewEmpRate(e.target.value)}
                  className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0B192C] text-white font-semibold rounded hover:bg-[#0F2547] cursor-pointer whitespace-nowrap mt-5"
              >
                Add Employee
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Employee Bio-Data, Certifications & Contract/SIA Expiry Alerts */}
      <div className="border border-slate-200 rounded bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-[#0B192C]">
            Personnel Dossiers, Certifications & License Expiry Tracking
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {state.employees.length} Active Personnel Records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Employee & Badge</th>
                <th className="py-2.5 px-4">Role & Clearance</th>
                <th className="py-2.5 px-4">Assigned Site</th>
                <th className="py-2.5 px-4">Certifications</th>
                <th className="py-2.5 px-4">Contract & SIA Expiry</th>
                {canEditHR && (
                  <th className="py-2.5 px-4 text-right">HR & Director Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {state.employees.map((emp) => {
                const site = state.sites.find((s) => s.id === emp.assignedSiteId);
                const siaExpiringSoon = emp.siaLicenseExpiry.startsWith('2026-11');
                const contractExpiringSoon =
                  emp.contractExpiry.startsWith('2026-11');
                const isEditing = editingEmpId === emp.id;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            aria-label="Edit employee name"
                            value={editEmpName}
                            onChange={(e) => setEditEmpName(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded"
                          />
                          <input
                            type="text"
                            aria-label="Edit employee badge"
                            value={editEmpBadge}
                            onChange={(e) => setEditEmpBadge(e.target.value)}
                            className="w-full px-2 py-1 font-mono border border-slate-300 rounded"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-slate-900">
                            {emp.fullName}
                          </div>
                          <div className="font-mono text-slate-500">
                            {emp.badgeNumber} · Started {emp.startDate}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <select
                          aria-label="Edit employee role"
                          value={editEmpRole}
                          onChange={(e) =>
                            setEditEmpRole(e.target.value as Role)
                          }
                          className="px-2 py-1 border border-slate-300 rounded bg-white"
                        >
                          {(state.rolesList || []).map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <div className="font-semibold text-[#0B192C]">
                            {emp.role}
                          </div>
                          <div className="text-slate-500">
                            {emp.clearanceLevel}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {isEditing ? (
                        <select
                          aria-label="Edit employee site"
                          value={editEmpSiteId}
                          onChange={(e) => setEditEmpSiteId(e.target.value)}
                          className="px-2 py-1 border border-slate-300 rounded bg-white"
                        >
                          {state.sites.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.siteName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        site?.siteName || 'Unassigned'
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {emp.certifications.join(' · ')}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      <div
                        className={
                          siaExpiringSoon
                            ? 'text-red-700 font-bold'
                            : 'text-slate-800'
                        }
                      >
                        SIA License: {emp.siaLicenseExpiry}
                        {siaExpiringSoon ? ' (Expiring <30d)' : ''}
                      </div>
                      <div
                        className={
                          contractExpiringSoon
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-500'
                        }
                      >
                        Contract: {emp.contractExpiry}
                      </div>
                    </td>
                    {canEditHR && (
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveEmployeeEdit(emp.id)}
                              className="px-2.5 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEmpId(null)}
                              className="px-2.5 py-1 border border-slate-300 text-slate-700 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onRenewCertification(emp.id);
                                setMsg(
                                  `Updated SIA License & Contract renewal dates for ${emp.fullName}.`
                                );
                              }}
                              className="px-2.5 py-1 border border-slate-300 rounded text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                              Extend (+1 Yr)
                            </button>
                            {onUpdateEmployee && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEmpId(emp.id);
                                  setEditEmpName(emp.fullName);
                                  setEditEmpBadge(emp.badgeNumber);
                                  setEditEmpRole(emp.role);
                                  setEditEmpSiteId(emp.assignedSiteId);
                                }}
                                className="px-2 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            {isDirector && onDeleteEmployee && (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteEmployee(emp.id);
                                  setMsg(
                                    `Deleted employee dossier for ${emp.fullName}.`
                                  );
                                }}
                                className="px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Requests + Disciplinary Records Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 border border-slate-200 rounded bg-white">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Leave Requests & Approvals
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {state.leaveRequests.map((lv) => (
              <div
                key={lv.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {lv.employeeName} · {lv.leaveType}
                  </p>
                  <p className="font-mono text-slate-500 mt-0.5">
                    {lv.startDate} → {lv.endDate} · Status:{' '}
                    <strong>{lv.status}</strong>
                  </p>
                  <p className="text-slate-600 mt-1">{lv.reason}</p>
                </div>
                {canEditHR && lv.status === 'Pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onReviewLeave(lv.id, 'Approved')}
                      className="px-3 py-1.5 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReviewLeave(lv.id, 'Declined')}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 font-semibold rounded cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <div className="border border-slate-200 rounded bg-white">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-display text-sm font-bold text-[#0B192C]">
                Disciplinary & Commendation Log
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {state.disciplinaryRecords.map((d) => (
                <div key={d.id} className="px-5 py-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {d.employeeName} · {d.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">{d.date}</span>
                      {isDirector && onDeleteDisciplinary && (
                        <button
                          type="button"
                          onClick={() => onDeleteDisciplinary(d.id)}
                          className="text-red-700 hover:underline font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-600 mt-1">{d.description}</p>
                  <p className="text-slate-800 font-medium mt-1">
                    Resolution: {d.actionTaken}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {canEditHR && (
            <form
              onSubmit={handleCreateDisc}
              className="border border-slate-200 rounded bg-white p-5 space-y-3 text-xs"
            >
              <h3 className="font-display text-sm font-bold text-[#0B192C]">
                Log New Disciplinary / Personnel Record
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="disc-emp"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Employee
                  </label>
                  <select
                    id="disc-emp"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {state.employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="disc-cat"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="disc-cat"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as DisciplinaryRecord['category'])
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Commendation / Audit Note">
                      Commendation / Audit Note
                    </option>
                    <option value="Late Clock-In">Late Clock-In</option>
                    <option value="Uniform / Equipment Compliance">
                      Uniform / Equipment Compliance
                    </option>
                    <option value="Protocol Deviation">Protocol Deviation</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="disc-desc"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Summary
                </label>
                <input
                  id="disc-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe observation or compliance event"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label
                  htmlFor="disc-action"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Action Taken
                </label>
                <input
                  id="disc-action"
                  type="text"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g. Formal written note / Briefing"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0B192C] text-white font-semibold rounded hover:bg-[#0F2547] cursor-pointer"
              >
                Save Personnel Record
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5.4 SCHEDULING & SHIFT MANAGEMENT MODULE
   ============================================================================ */
export function SchedulingShiftsModule({
  currentUser,
  state,
  onCreateShift,
  onUpdateShift,
  onDeleteShift,
  onApproveShift,
  onGuardClockToggle,
  onMarkNoShow,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateShift: (shift: Omit<ShiftRecord, 'id'>) => void;
  onUpdateShift?: (shiftId: string, patch: Partial<ShiftRecord>) => void;
  onDeleteShift?: (shiftId: string) => void;
  onApproveShift: (shiftId: string) => void;
  onGuardClockToggle: (shiftId: string) => void;
  onMarkNoShow: (shiftId: string) => void;
}) {
  const isDirector = currentUser.role === Role.DIRECTOR;
  const rlsCtx = {
    userId: currentUser.id,
    role: currentUser.role,
    clientId: currentUser.clientId,
    assignedSiteIds: currentUser.assignedSiteIds,
  };
  const visibleShifts = filterShiftsByRLS(state.shifts, rlsCtx);
  const canSchedule =
    currentUser.role === Role.DIRECTOR ||
    currentUser.role === Role.OPERATION_MANAGER ||
    currentUser.role === Role.SUPERVISOR;

  const guards = state.accounts.filter((a) => a.role === Role.GUARD);
  const [siteId, setSiteId] = useState(state.sites[0]?.id || 'site-1');
  const [guardId, setGuardId] = useState(guards[0]?.id || 'usr-grd-1');
  const [startTime, setStartTime] = useState('2026-10-27T06:00');
  const [endTime, setEndTime] = useState('2026-10-27T14:00');
  const [postAssignment, setPostAssignment] = useState(
    'North Perimeter Gate & Biometric Airlock'
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit Shift State
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editPostAssignment, setEditPostAssignment] = useState('');
  const [editShiftSiteId, setEditShiftSiteId] = useState('');

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const startIso = startTime.endsWith('Z') ? startTime : `${startTime}:00Z`;
    const endIso = endTime.endsWith('Z') ? endTime : `${endTime}:00Z`;

    const check = validateShiftTimes(startIso, endIso);
    if (!check.valid) {
      setError(check.error || 'Invalid shift times.');
      return;
    }

    const guard = state.accounts.find((a) => a.id === guardId);
    const durationHrs = Math.round(
      (Date.parse(endIso) - Date.parse(startIso)) / (1000 * 60 * 60)
    );

    onCreateShift({
      siteId,
      guardId,
      guardName: guard?.fullName || 'Assigned Guard',
      startTime: startIso,
      endTime: endIso,
      postAssignment: postAssignment.trim() || 'Standard Guard Post',
      status:
        currentUser.role === Role.SUPERVISOR ? 'Pending Approval' : 'Scheduled',
      hoursLogged: durationHrs,
    });

    setSuccess(`Shift assigned for ${guard?.username} (${durationHrs} hrs).`);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-mono text-slate-500">
          ROSTER DEPLOYMENT · SUPERVISOR APPROVAL · GPS ATTENDANCE
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
          Scheduling, Shift Rosters & Guard Attendance
        </h1>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {canSchedule && (
          <form
            onSubmit={handleAddShift}
            className="lg:col-span-4 border border-slate-200 rounded bg-white p-6 space-y-4 text-xs"
            noValidate
          >
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Assign New Guard Shift
            </h2>
            <div>
              <label
                htmlFor="shift-site"
                className="block font-semibold text-slate-800 mb-1"
              >
                Contracted Site
              </label>
              <select
                id="shift-site"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                {state.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="shift-guard"
                className="block font-semibold text-slate-800 mb-1"
              >
                Assigned Guard
              </label>
              <select
                id="shift-guard"
                value={guardId}
                onChange={(e) => setGuardId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                {guards.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.fullName} ({g.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="shift-post"
                className="block font-semibold text-slate-800 mb-1"
              >
                Tactical Post Assignment
              </label>
              <input
                id="shift-post"
                type="text"
                value={postAssignment}
                onChange={(e) => setPostAssignment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="shift-start"
                className="block font-semibold text-slate-800 mb-1"
              >
                Start Time (UTC)
              </label>
              <input
                id="shift-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="shift-end"
                className="block font-semibold text-slate-800 mb-1"
              >
                End Time (UTC)
              </label>
              <input
                id="shift-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B192C] hover:bg-[#0F2547] text-white font-semibold rounded cursor-pointer"
            >
              Publish Shift to Roster
            </button>
          </form>
        )}

        <div
          className={`${
            canSchedule ? 'lg:col-span-8' : 'lg:col-span-12'
          } border border-slate-200 rounded bg-white overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Active Roster & GPS Clock-In / Clock-Out Log ({visibleShifts.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Guard & Post</th>
                  <th className="py-2.5 px-4">Site</th>
                  <th className="py-2.5 px-4">Schedule (UTC)</th>
                  <th className="py-2.5 px-4">Status & Geo-Telemetry</th>
                  <th className="py-2.5 px-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleShifts.map((sh) => {
                  const site = state.sites.find((s) => s.id === sh.siteId);
                  const isEditing = editingShiftId === sh.id;
                  return (
                    <tr key={sh.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {sh.guardName}
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            aria-label="Edit post assignment"
                            value={editPostAssignment}
                            onChange={(e) =>
                              setEditPostAssignment(e.target.value)
                            }
                            className="mt-1 w-full px-2 py-1 border border-slate-300 rounded"
                          />
                        ) : (
                          <div className="text-slate-500">
                            {sh.postAssignment}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {isEditing ? (
                          <select
                            aria-label="Edit shift site"
                            value={editShiftSiteId}
                            onChange={(e) => setEditShiftSiteId(e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded bg-white"
                          >
                            {state.sites.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.siteName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          site?.siteName || sh.siteId
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        <div>{sh.startTime.replace('T', ' ').slice(0, 16)}</div>
                        <div>{sh.endTime.replace('T', ' ').slice(0, 16)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-[#0B192C]">
                          {sh.status} ({sh.hoursLogged}h)
                        </div>
                        {sh.geoTag && (
                          <div className="text-[11px] font-mono text-emerald-700 mt-0.5">
                            {sh.geoTag}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateShift) {
                                  onUpdateShift(sh.id, {
                                    postAssignment: editPostAssignment.trim(),
                                    siteId: editShiftSiteId,
                                  });
                                }
                                setEditingShiftId(null);
                              }}
                              className="px-2.5 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingShiftId(null)}
                              className="px-2.5 py-1 border border-slate-300 text-slate-700 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {canSchedule && sh.status === 'Pending Approval' && (
                              <button
                                type="button"
                                onClick={() => onApproveShift(sh.id)}
                                className="px-2.5 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            {sh.status !== 'Completed' &&
                              sh.status !== 'No-Show' && (
                                <button
                                  type="button"
                                  onClick={() => onGuardClockToggle(sh.id)}
                                  className="px-2.5 py-1 border border-[#0B192C] text-[#0B192C] font-semibold rounded hover:bg-slate-100 cursor-pointer"
                                >
                                  {sh.status === 'Active / On-Post'
                                    ? 'Clock Out'
                                    : 'Clock In (GPS)'}
                                </button>
                              )}
                            {canSchedule && sh.status === 'Scheduled' && (
                              <button
                                type="button"
                                onClick={() => onMarkNoShow(sh.id)}
                                className="px-2.5 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50 cursor-pointer"
                              >
                                Mark No-Show
                              </button>
                            )}
                            {isDirector && onUpdateShift && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingShiftId(sh.id);
                                  setEditPostAssignment(sh.postAssignment);
                                  setEditShiftSiteId(sh.siteId);
                                }}
                                className="px-2 py-1 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            {isDirector && onDeleteShift && (
                              <button
                                type="button"
                                onClick={() => onDeleteShift(sh.id)}
                                className="px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </>
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
    </div>
  );
}

/* ============================================================================
   5.5 SITE & CLIENT MANAGEMENT MODULE (WITH FULL DIRECTOR CRUD FOR SITES, CLIENTS & SERVICES)
   ============================================================================ */
export function SitesClientsModule({
  currentUser,
  state,
  onAddSite,
  onUpdateSite,
  onDeleteSite,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onAddServiceLine,
  onUpdateServiceLine,
  onDeleteServiceLine,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onAddSite: (site: Omit<SiteRecord, 'id'>) => void;
  onUpdateSite?: (siteId: string, patch: Partial<SiteRecord>) => void;
  onDeleteSite?: (siteId: string) => void;
  onAddClient?: (client: Omit<ClientRecord, 'id'>) => void;
  onUpdateClient?: (clientId: string, patch: Partial<ClientRecord>) => void;
  onDeleteClient?: (clientId: string) => void;
  onAddServiceLine?: (name: string) => void;
  onUpdateServiceLine?: (oldName: string, newName: string) => void;
  onDeleteServiceLine?: (name: string) => void;
}) {
  const canEditSites = hasPermission(currentUser.role, 'sites_clients', 'edit');
  const isDirector = currentUser.role === Role.DIRECTOR;
  const activeServiceLines = state.serviceLines || ALL_SERVICE_LINES;

  const [siteName, setSiteName] = useState('');
  const [address, setAddress] = useState('');
  const [clientId, setClientId] = useState(state.clients[0]?.id || 'client-1');
  const [serviceType, setServiceType] = useState<string>(
    activeServiceLines[0] || ServiceLine.MANNED_GUARDING
  );
  const [riskLevel, setRiskLevel] = useState<SiteRecord['riskLevel']>('High');
  const [riskNotes, setRiskNotes] = useState('');
  const [requiredGuards, setRequiredGuards] = useState(4);
  const [activeCameras, setActiveCameras] = useState(24);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Inline Edit Site State
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteAddress, setEditSiteAddress] = useState('');
  const [editSiteService, setEditSiteService] = useState('');
  const [editSiteRiskLevel, setEditSiteRiskLevel] =
    useState<SiteRecord['riskLevel']>('High');
  const [editSiteGuards, setEditSiteGuards] = useState(4);
  const [editSiteCams, setEditSiteCams] = useState(24);
  const [editSiteNotes, setEditSiteNotes] = useState('');

  // Service Line CRUD State
  const [newServiceLine, setNewServiceLine] = useState('');
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editingServiceVal, setEditingServiceVal] = useState('');

  // Client CRUD State
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientInfo, setNewClientInfo] = useState('');
  const [newClientTier, setNewClientTier] =
    useState<ClientRecord['contractTier']>('Enterprise Sovereign');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientCompany, setEditClientCompany] = useState('');
  const [editClientContact, setEditClientContact] = useState('');

  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim() || !address.trim()) return;
    onAddSite({
      clientId,
      siteName: siteName.trim(),
      address: address.trim(),
      serviceType: serviceType as ServiceLine,
      supervisorId: 'usr-sup-1',
      assignedGuardIds: ['usr-grd-1'],
      riskLevel,
      riskNotes:
        riskNotes.trim() ||
        'Standard perimeter patrol & access badge verification.',
      cctvStatus: 'Online',
      activeCameras: Number(activeCameras) || 16,
      requiredGuards: Number(requiredGuards) || 2,
    });
    setStatusMsg(`Added contracted site "${siteName.trim()}".`);
    setSiteName('');
    setAddress('');
    setRiskNotes('');
  };

  const handleSaveSiteEdit = (id: string) => {
    if (!editSiteName.trim() || !onUpdateSite) return;
    onUpdateSite(id, {
      siteName: editSiteName.trim(),
      address: editSiteAddress.trim(),
      serviceType: editSiteService as ServiceLine,
      riskLevel: editSiteRiskLevel,
      requiredGuards: Number(editSiteGuards) || 2,
      activeCameras: Number(editSiteCams) || 0,
      riskNotes: editSiteNotes.trim(),
    });
    setEditingSiteId(null);
    setStatusMsg(`Updated contracted site "${editSiteName.trim()}".`);
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientCompany.trim() || !onAddClient) return;
    onAddClient({
      companyName: newClientCompany.trim(),
      contactPerson: newClientContact.trim() || 'Operations Director',
      contactInfo: newClientInfo.trim() || '+44 20 7946 0900',
      contractTier: newClientTier,
      activeSince: '2026-10-25',
    });
    setStatusMsg(`Added client account "${newClientCompany.trim()}".`);
    setNewClientCompany('');
    setNewClientContact('');
    setNewClientInfo('');
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-mono text-slate-500">
          CONTRACTED SITES · CLIENT ACCOUNTS · COMPANY SECURITY SERVICE LINES
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
          Site, Client & Security Service Lines Registry
        </h1>
      </div>

      {statusMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Company Security Service Lines CRUD (Director) */}
      {isDirector && (
        <div className="border border-slate-200 rounded bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-bold text-[#0B192C]">
                Company Security Services Provided — Add, Edit & Delete ({activeServiceLines.length})
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Director control over all security service lines offered by the company.
              </p>
            </div>
            {onAddServiceLine && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newServiceLine.trim()) return;
                  onAddServiceLine(newServiceLine.trim());
                  setStatusMsg(
                    `Added company service line "${newServiceLine.trim()}".`
                  );
                  setNewServiceLine('');
                }}
                className="flex items-center gap-2 text-xs"
              >
                <input
                  type="text"
                  aria-label="New company service line"
                  value={newServiceLine}
                  onChange={(e) => setNewServiceLine(e.target.value)}
                  placeholder="Add new security service..."
                  className="px-3 py-1.5 border border-slate-300 rounded bg-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#0B192C] text-white font-semibold rounded hover:bg-[#0F2547] cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Service</span>
                </button>
              </form>
            )}
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {activeServiceLines.map((sl) => {
              const isEditing = editingService === sl;
              return (
                <div
                  key={sl}
                  className="p-3 border border-slate-200 rounded bg-slate-50 flex items-center justify-between gap-2"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        aria-label="Edit service line name"
                        value={editingServiceVal}
                        onChange={(e) => setEditingServiceVal(e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingServiceVal.trim() && onUpdateServiceLine) {
                            onUpdateServiceLine(sl, editingServiceVal.trim());
                            setStatusMsg(
                              `Updated service line "${sl}" to "${editingServiceVal.trim()}".`
                            );
                          }
                          setEditingService(null);
                        }}
                        className="px-2 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingService(null)}
                        className="px-2 py-1 border border-slate-300 text-slate-700 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-[#0B192C] truncate">
                        {sl}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingService(sl);
                            setEditingServiceVal(sl);
                          }}
                          className="px-2 py-0.5 border border-slate-300 rounded text-slate-700 hover:bg-white cursor-pointer"
                        >
                          Edit
                        </button>
                        {onDeleteServiceLine && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteServiceLine(sl);
                              setStatusMsg(`Deleted service line "${sl}".`);
                            }}
                            className="px-2 py-0.5 border border-red-200 text-red-700 rounded hover:bg-red-50 cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Client Organizations Strip + Director Client CRUD */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {state.clients.map((cl) => {
            const isEditingClient = editingClientId === cl.id;
            return (
              <div
                key={cl.id}
                className="p-5 border border-slate-200 rounded bg-white flex flex-col justify-between gap-3"
              >
                {isEditingClient ? (
                  <div className="space-y-2 text-xs">
                    <input
                      type="text"
                      aria-label="Edit client company name"
                      value={editClientCompany}
                      onChange={(e) => setEditClientCompany(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      aria-label="Edit client contact person"
                      value={editClientContact}
                      onChange={(e) => setEditClientContact(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (editClientCompany.trim() && onUpdateClient) {
                            onUpdateClient(cl.id, {
                              companyName: editClientCompany.trim(),
                              contactPerson: editClientContact.trim(),
                            });
                            setStatusMsg(
                              `Updated client "${editClientCompany.trim()}".`
                            );
                          }
                          setEditingClientId(null);
                        }}
                        className="px-2.5 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingClientId(null)}
                        className="px-2.5 py-1 border border-slate-300 text-slate-700 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-mono text-slate-500">
                        {cl.contractTier}
                      </p>
                      <h2 className="font-display text-sm font-bold text-[#0B192C] mt-1">
                        {cl.companyName}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1">
                        Contact: {cl.contactPerson}
                      </p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        {cl.contactInfo}
                      </p>
                    </div>
                    {isDirector && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                        {onUpdateClient && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClientId(cl.id);
                              setEditClientCompany(cl.companyName);
                              setEditClientContact(cl.contactPerson);
                            }}
                            className="px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Edit Client
                          </button>
                        )}
                        {onDeleteClient && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteClient(cl.id);
                              setStatusMsg(
                                `Deleted client "${cl.companyName}".`
                              );
                            }}
                            className="px-2.5 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50 cursor-pointer"
                          >
                            Delete Client
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {isDirector && onAddClient && (
          <form
            onSubmit={handleAddClientSubmit}
            className="border border-slate-200 rounded bg-white p-4 flex flex-wrap items-end gap-3 text-xs"
          >
            <div className="flex-1 min-w-[180px]">
              <label
                htmlFor="new-client-company"
                className="block font-semibold text-slate-700 mb-1"
              >
                Add New Client Organization
              </label>
              <input
                id="new-client-company"
                type="text"
                value={newClientCompany}
                onChange={(e) => setNewClientCompany(e.target.value)}
                placeholder="Company Name"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
            <div className="min-w-[150px]">
              <label
                htmlFor="new-client-contact"
                className="block font-semibold text-slate-700 mb-1"
              >
                Contact Person
              </label>
              <input
                id="new-client-contact"
                type="text"
                value={newClientContact}
                onChange={(e) => setNewClientContact(e.target.value)}
                placeholder="Full Name"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
            <div className="min-w-[150px]">
              <label
                htmlFor="new-client-phone"
                className="block font-semibold text-slate-700 mb-1"
              >
                Phone / Contact Info
              </label>
              <input
                id="new-client-phone"
                type="text"
                value={newClientInfo}
                onChange={(e) => setNewClientInfo(e.target.value)}
                placeholder="+44 20 7946 0900"
                className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="new-client-tier"
                className="block font-semibold text-slate-700 mb-1"
              >
                Contract Tier
              </label>
              <select
                id="new-client-tier"
                value={newClientTier}
                onChange={(e) =>
                  setNewClientTier(
                    e.target.value as ClientRecord['contractTier']
                  )
                }
                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="Enterprise Sovereign">
                  Enterprise Sovereign
                </option>
                <option value="Industrial Priority">Industrial Priority</option>
                <option value="Commercial Standard">Commercial Standard</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0B192C] text-white font-semibold rounded hover:bg-[#0F2547] cursor-pointer"
            >
              Add Client
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {canEditSites && (
          <form
            onSubmit={handleCreateSite}
            className="lg:col-span-4 border border-slate-200 rounded bg-white p-6 space-y-3.5 text-xs"
          >
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Register New Contracted Site
            </h2>
            <div>
              <label
                htmlFor="site-name"
                className="block font-semibold text-slate-800 mb-1"
              >
                Site / Facility Name
              </label>
              <input
                id="site-name"
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Sovereign Bonded Vault Annex"
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="site-client"
                className="block font-semibold text-slate-800 mb-1"
              >
                Client Account
              </label>
              <select
                id="site-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="site-service"
                className="block font-semibold text-slate-800 mb-1"
              >
                Primary Service Line
              </label>
              <select
                id="site-service"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                {activeServiceLines.map((sl) => (
                  <option key={sl} value={sl}>
                    {sl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="site-address"
                className="block font-semibold text-slate-800 mb-1"
              >
                Physical Address
              </label>
              <input
                id="site-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, Postcode, Sector"
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor="site-risk-level"
                  className="block font-semibold text-slate-800 mb-1"
                >
                  Risk Level
                </label>
                <select
                  id="site-risk-level"
                  value={riskLevel}
                  onChange={(e) =>
                    setRiskLevel(e.target.value as SiteRecord['riskLevel'])
                  }
                  className="w-full px-2 py-2 border border-slate-300 rounded bg-white"
                >
                  <option value="Standard">Standard</option>
                  <option value="Elevated">Elevated</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="site-guards"
                  className="block font-semibold text-slate-800 mb-1"
                >
                  Guards
                </label>
                <input
                  id="site-guards"
                  type="number"
                  min={1}
                  value={requiredGuards}
                  onChange={(e) => setRequiredGuards(Number(e.target.value))}
                  className="w-full px-2 py-2 font-mono border border-slate-300 rounded"
                />
              </div>
              <div>
                <label
                  htmlFor="site-cams"
                  className="block font-semibold text-slate-800 mb-1"
                >
                  Cameras
                </label>
                <input
                  id="site-cams"
                  type="number"
                  min={0}
                  value={activeCameras}
                  onChange={(e) => setActiveCameras(Number(e.target.value))}
                  className="w-full px-2 py-2 font-mono border border-slate-300 rounded"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="site-risk-notes"
                className="block font-semibold text-slate-800 mb-1"
              >
                Tactical Risk Notes & SOPs
              </label>
              <textarea
                id="site-risk-notes"
                rows={2}
                value={riskNotes}
                onChange={(e) => setRiskNotes(e.target.value)}
                placeholder="Airlock protocol, patrol cadence, escalation triggers..."
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B192C] hover:bg-[#0F2547] text-white font-semibold rounded cursor-pointer"
            >
              Add Contracted Site
            </button>
          </form>
        )}

        <div
          className={`${
            canEditSites ? 'lg:col-span-8' : 'lg:col-span-12'
          } border border-slate-200 rounded bg-white overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Contracted Sites & Service Line Matrix ({state.sites.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {state.sites.map((site) => {
              const client = state.clients.find((c) => c.id === site.clientId);
              const isEditing = editingSiteId === site.id;

              return (
                <div key={site.id} className="p-5 hover:bg-slate-50">
                  {isEditing ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Site Name
                          </label>
                          <input
                            type="text"
                            aria-label="Edit site name"
                            value={editSiteName}
                            onChange={(e) => setEditSiteName(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Service Line
                          </label>
                          <select
                            aria-label="Edit site service line"
                            value={editSiteService}
                            onChange={(e) => setEditSiteService(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          >
                            {activeServiceLines.map((sl) => (
                              <option key={sl} value={sl}>
                                {sl}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            aria-label="Edit site address"
                            value={editSiteAddress}
                            onChange={(e) => setEditSiteAddress(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Required Guards
                          </label>
                          <input
                            type="number"
                            aria-label="Edit site guards"
                            value={editSiteGuards}
                            onChange={(e) =>
                              setEditSiteGuards(Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Active Cameras
                          </label>
                          <input
                            type="number"
                            aria-label="Edit site cameras"
                            value={editSiteCams}
                            onChange={(e) =>
                              setEditSiteCams(Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Risk Notes
                        </label>
                        <input
                          type="text"
                          aria-label="Edit site risk notes"
                          value={editSiteNotes}
                          onChange={(e) => setEditSiteNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveSiteEdit(site.id)}
                          className="px-3 py-1.5 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                        >
                          Save Site Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSiteId(null)}
                          className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-mono text-slate-500">
                            {site.serviceType} · Client: {client?.companyName}
                          </p>
                          <h3 className="font-display text-base font-bold text-[#0B192C] mt-0.5">
                            {site.siteName}
                          </h3>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {site.address}
                          </p>
                        </div>
                        <div className="text-right text-xs font-mono tabular-nums space-y-1.5">
                          <div className="font-bold text-slate-900">
                            Risk Level: {site.riskLevel}
                          </div>
                          <div className="text-slate-600">
                            Coverage: {site.requiredGuards} Guards ·{' '}
                            {site.activeCameras} Cameras ({site.cctvStatus})
                          </div>
                          {canEditSites && (
                            <div className="flex items-center justify-end gap-2 pt-1">
                              {onUpdateSite && (
                                <button
                                  type="button"
                                  data-testid={`edit-site-${site.id}`}
                                  onClick={() => {
                                    setEditingSiteId(site.id);
                                    setEditSiteName(site.siteName);
                                    setEditSiteAddress(site.address);
                                    setEditSiteService(site.serviceType);
                                    setEditSiteRiskLevel(site.riskLevel);
                                    setEditSiteGuards(site.requiredGuards);
                                    setEditSiteCams(site.activeCameras);
                                    setEditSiteNotes(site.riskNotes);
                                  }}
                                  className="px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-white font-sans font-semibold cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit Site</span>
                                </button>
                              )}
                              {isDirector && onDeleteSite && (
                                <button
                                  type="button"
                                  data-testid={`delete-site-${site.id}`}
                                  onClick={() => {
                                    onDeleteSite(site.id);
                                    setStatusMsg(
                                      `Deleted contracted site "${site.siteName}".`
                                    );
                                  }}
                                  className="px-2.5 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50 font-sans font-semibold cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete Site</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                        <strong>Risk Notes:</strong> {site.riskNotes}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5.6 INCIDENT & OCCURRENCE REPORTING MODULE
   ============================================================================ */
export function IncidentReportingModule({
  currentUser,
  state,
  onCreateIncident,
  onUpdateIncident,
  onDeleteIncident,
  onEscalateIncident,
  onResolveIncident,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateIncident: (inc: Omit<IncidentRecord, 'id'>) => void;
  onUpdateIncident?: (incId: string, patch: Partial<IncidentRecord>) => void;
  onDeleteIncident?: (incId: string) => void;
  onEscalateIncident: (incId: string, nextStage: IncidentRecord['status']) => void;
  onResolveIncident: (incId: string) => void;
}) {
  const isDirector = currentUser.role === Role.DIRECTOR;
  const rlsCtx = {
    userId: currentUser.id,
    role: currentUser.role,
    clientId: currentUser.clientId,
    assignedSiteIds: currentUser.assignedSiteIds,
  };
  const visibleIncidents = filterIncidentsByRLS(state.incidents, rlsCtx);
  const canLog = hasPermission(currentUser.role, 'incidents', 'edit');

  const [siteId, setSiteId] = useState(state.sites[0]?.id || 'site-1');
  const [type, setType] = useState<IncidentRecord['type']>(
    'Perimeter Breach Attempt'
  );
  const [severity, setSeverity] = useState<IncidentRecord['severity']>('High');
  const [description, setDescription] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [clientVisible, setClientVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit Incident State
  const [editingIncId, setEditingIncId] = useState<string | null>(null);
  const [editIncDesc, setEditIncDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const check = validateIncidentReport({ siteId, type, description });
    if (!check.valid) {
      setError(check.error || 'Invalid incident report.');
      return;
    }

    onCreateIncident({
      siteId,
      reportedBy: currentUser.id,
      reporterName: currentUser.username,
      type,
      severity,
      description: description.trim(),
      attachments: attachmentName.trim() ? [attachmentName.trim()] : [],
      status: 'Open',
      escalatedTo: 'Supervisor (David Keller)',
      clientVisible,
      occurredAt: new Date().toISOString(),
    });

    setDescription('');
    setAttachmentName('');
    setSuccess('Incident occurrence logged and routed to site Supervisor.');
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-mono text-slate-500">
          OCCURRENCE LOGGING · ESCALATION CHAIN (GUARD → SUPERVISOR → COMMAND)
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
          Incident & Occurrence Reporting
        </h1>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {canLog && (
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-4 border border-slate-200 rounded bg-white p-6 space-y-4 text-xs"
            noValidate
          >
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Log New Security Incident
            </h2>
            <div>
              <label
                htmlFor="inc-site"
                className="block font-semibold text-slate-800 mb-1"
              >
                Site Location
              </label>
              <select
                id="inc-site"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                {state.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="inc-type"
                  className="block font-semibold text-slate-800 mb-1"
                >
                  Incident Type
                </label>
                <select
                  id="inc-type"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as IncidentRecord['type'])
                  }
                  className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white"
                >
                  <option value="Perimeter Breach Attempt">
                    Perimeter Breach Attempt
                  </option>
                  <option value="Unauthorized Access">Unauthorized Access</option>
                  <option value="CCTV Feed Interruption">
                    CCTV Feed Interruption
                  </option>
                  <option value="CIT Route Deviation Alert">
                    CIT Route Deviation Alert
                  </option>
                  <option value="Medical / Safety Response">
                    Medical / Safety Response
                  </option>
                  <option value="Asset Seal Tamper Check">
                    Asset Seal Tamper Check
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="inc-severity"
                  className="block font-semibold text-slate-800 mb-1"
                >
                  Severity Tier
                </label>
                <select
                  id="inc-severity"
                  value={severity}
                  onChange={(e) =>
                    setSeverity(e.target.value as IncidentRecord['severity'])
                  }
                  className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor="inc-desc"
                className="block font-semibold text-slate-800 mb-1"
              >
                Detailed Occurrence Description (min 10 chars)
              </label>
              <textarea
                id="inc-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe chronological events, post sector, and immediate action taken..."
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="inc-attach"
                className="block font-semibold text-slate-800 mb-1"
              >
                Evidence / Photo Attachment Filename
              </label>
              <input
                id="inc-attach"
                type="text"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                placeholder="e.g. gate-cam04-snapshot.jpg"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clientVisible}
                onChange={(e) => setClientVisible(e.target.checked)}
              />
              <span className="text-slate-700">
                Publish sanitized summary to Client Portal for this site
              </span>
            </label>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B192C] hover:bg-[#0F2547] text-white font-semibold rounded cursor-pointer"
            >
              Submit Incident Report
            </button>
          </form>
        )}

        <div
          className={`${
            canLog ? 'lg:col-span-8' : 'lg:col-span-12'
          } border border-slate-200 rounded bg-white overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Incident Log & Escalation Tracker ({visibleIncidents.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {visibleIncidents.map((inc) => {
              const site = state.sites.find((s) => s.id === inc.siteId);
              const isEditing = editingIncId === inc.id;
              return (
                <div key={inc.id} className="p-5 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="font-mono font-bold text-red-700">
                        [{inc.severity.toUpperCase()}]
                      </span>{' '}
                      <span className="font-display text-sm font-bold text-[#0B192C]">
                        {inc.type}
                      </span>{' '}
                      <span className="text-slate-500">· {site?.siteName}</span>
                      <div className="font-mono text-slate-500 mt-0.5">
                        Reported by {inc.reporterName} ·{' '}
                        {inc.occurredAt.replace('T', ' ').slice(0, 16)} UTC ·
                        Client Visible: {inc.clientVisible ? 'Yes' : 'Internal Only'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-semibold text-[#0B192C]">
                        Status: {inc.status}
                      </span>
                      <div className="text-[11px] text-slate-500">
                        Assigned: {inc.escalatedTo}
                      </div>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        aria-label="Edit incident description"
                        value={editIncDesc}
                        onChange={(e) => setEditIncDesc(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editIncDesc.trim() && onUpdateIncident) {
                            onUpdateIncident(inc.id, {
                              description: editIncDesc.trim(),
                            });
                          }
                          setEditingIncId(null);
                        }}
                        className="px-3 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIncId(null)}
                        className="px-3 py-1 border border-slate-300 text-slate-700 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-700">{inc.description}</p>
                  )}

                  {inc.attachments.length > 0 && (
                    <div className="font-mono text-[11px] text-slate-500">
                      Attachments: {inc.attachments.join(', ')}
                    </div>
                  )}
                  {canLog && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {inc.status !== 'Resolved' &&
                        inc.status !== 'Escalated to Command' && (
                          <button
                            type="button"
                            onClick={() =>
                              onEscalateIncident(inc.id, 'Escalated to Command')
                            }
                            className="px-3 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                          >
                            Escalate to Operation Manager / Director
                          </button>
                        )}
                      {inc.status !== 'Resolved' && (
                        <button
                          type="button"
                          onClick={() => onResolveIncident(inc.id)}
                          className="px-3 py-1 border border-slate-300 text-slate-800 font-semibold rounded hover:bg-slate-100 cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {isDirector && onUpdateIncident && !isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIncId(inc.id);
                            setEditIncDesc(inc.description);
                          }}
                          className="px-2.5 py-1 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          Edit Incident
                        </button>
                      )}
                      {isDirector && onDeleteIncident && (
                        <button
                          type="button"
                          onClick={() => onDeleteIncident(inc.id)}
                          className="px-2.5 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50 cursor-pointer"
                        >
                          Delete Incident
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
