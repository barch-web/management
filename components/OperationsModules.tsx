'use client';

import React, { useState } from 'react';
import {
  Users,
  CalendarClock,
  Building2,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import {
  Role,
  ServiceLine,
  ALL_SERVICE_LINES,
  hasPermission,
  filterSitesByRLS,
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
  onRenewCertification,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onReviewLeave: (leaveId: string, decision: 'Approved' | 'Declined') => void;
  onAddDisciplinary: (rec: Omit<DisciplinaryRecord, 'id'>) => void;
  onRenewCertification: (empId: string) => void;
}) {
  const canEditHR = hasPermission(currentUser.role, 'hr_employees', 'edit');
  const [empId, setEmpId] = useState(state.employees[0]?.id || 'emp-1');
  const [category, setCategory] = useState<DisciplinaryRecord['category']>(
    'Commendation / Audit Note'
  );
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

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
          Note per Section 4.5: HR Managers manage personnel records, contracts,
          and certifications, while system login creation and role assignment
          remain restricted to Director and Operation Manager.
        </p>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{msg}</span>
        </div>
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
                {canEditHR && <th className="py-2.5 px-4 text-right">HR Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {state.employees.map((emp) => {
                const site = state.sites.find((s) => s.id === emp.assignedSiteId);
                const siaExpiringSoon = emp.siaLicenseExpiry.startsWith('2026-11');
                const contractExpiringSoon = emp.contractExpiry.startsWith('2026-11');
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{emp.fullName}</div>
                      <div className="font-mono text-slate-500">
                        {emp.badgeNumber} · Started {emp.startDate}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0B192C]">{emp.role}</div>
                      <div className="text-slate-500">{emp.clearanceLevel}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {site?.siteName || 'Unassigned'}
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
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            onRenewCertification(emp.id);
                            setMsg(
                              `Updated SIA License & Contract renewal dates for ${emp.fullName}.`
                            );
                          }}
                          className="px-2.5 py-1 border border-slate-300 rounded text-slate-800 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                        >
                          Extend License / Contract (+1 Yr)
                        </button>
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
                    {lv.startDate} → {lv.endDate} · Status: <strong>{lv.status}</strong>
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
                    <span className="font-mono text-slate-500">{d.date}</span>
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
  onApproveShift,
  onGuardClockToggle,
  onMarkNoShow,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateShift: (shift: Omit<ShiftRecord, 'id'>) => void;
  onApproveShift: (shiftId: string) => void;
  onGuardClockToggle: (shiftId: string) => void;
  onMarkNoShow: (shiftId: string) => void;
}) {
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

    setSuccess(`Shift assigned for ${guard?.fullName} (${durationHrs} hrs).`);
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
                  return (
                    <tr key={sh.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {sh.guardName}
                        </div>
                        <div className="text-slate-500">{sh.postAssignment}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {site?.siteName || sh.siteId}
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
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        {canSchedule && sh.status === 'Pending Approval' && (
                          <button
                            type="button"
                            onClick={() => onApproveShift(sh.id)}
                            className="px-2.5 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {sh.status !== 'Completed' && sh.status !== 'No-Show' && (
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
   5.5 SITE & CLIENT MANAGEMENT MODULE
   ============================================================================ */
export function SitesClientsModule({
  currentUser,
  state,
  onAddSite,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onAddSite: (site: Omit<SiteRecord, 'id'>) => void;
}) {
  const canEditSites = hasPermission(currentUser.role, 'sites_clients', 'edit');
  const [siteName, setSiteName] = useState('');
  const [address, setAddress] = useState('');
  const [clientId, setClientId] = useState(state.clients[0]?.id || 'client-1');
  const [serviceType, setServiceType] = useState<ServiceLine>(
    ServiceLine.MANNED_GUARDING
  );
  const [riskLevel, setRiskLevel] = useState<SiteRecord['riskLevel']>('High');
  const [riskNotes, setRiskNotes] = useState('');
  const [requiredGuards, setRequiredGuards] = useState(4);
  const [activeCameras, setActiveCameras] = useState(24);

  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim() || !address.trim()) return;
    onAddSite({
      clientId,
      siteName: siteName.trim(),
      address: address.trim(),
      serviceType,
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
    setSiteName('');
    setAddress('');
    setRiskNotes('');
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-mono text-slate-500">
          CONTRACTED SITES · CLIENT ACCOUNTS · 7 SECURITY SERVICE LINES
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
          Site & Client Operations Registry
        </h1>
      </div>

      {/* Client Organizations Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {state.clients.map((cl) => (
          <div
            key={cl.id}
            className="p-5 border border-slate-200 rounded bg-white"
          >
            <p className="text-xs font-mono text-slate-500">{cl.contractTier}</p>
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
        ))}
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
                onChange={(e) => setServiceType(e.target.value as ServiceLine)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                {ALL_SERVICE_LINES.map((sl) => (
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="site-guards"
                  className="block font-semibold text-slate-800 mb-1"
                >
                  Required Guards
                </label>
                <input
                  id="site-guards"
                  type="number"
                  min={1}
                  value={requiredGuards}
                  onChange={(e) => setRequiredGuards(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
                />
              </div>
              <div>
                <label
                  htmlFor="site-cams"
                  className="block font-semibold text-slate-800 mb-1"
                >
                  CCTV Cameras
                </label>
                <input
                  id="site-cams"
                  type="number"
                  min={0}
                  value={activeCameras}
                  onChange={(e) => setActiveCameras(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
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
              return (
                <div key={site.id} className="p-5 hover:bg-slate-50">
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
                    <div className="text-right text-xs font-mono tabular-nums">
                      <div className="font-bold text-slate-900">
                        Risk Level: {site.riskLevel}
                      </div>
                      <div className="text-slate-600">
                        Coverage: {site.requiredGuards} Guards · {site.activeCameras} Cameras ({site.cctvStatus})
                      </div>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <strong>Risk Notes:</strong> {site.riskNotes}
                  </p>
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
  onEscalateIncident,
  onResolveIncident,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateIncident: (inc: Omit<IncidentRecord, 'id'>) => void;
  onEscalateIncident: (incId: string, nextStage: IncidentRecord['status']) => void;
  onResolveIncident: (incId: string) => void;
}) {
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
      reporterName: currentUser.fullName,
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
                placeholder="Document exact time, sector, personnel response, and containment actions..."
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="inc-attach"
                className="block font-semibold text-slate-800 mb-1"
              >
                Evidence / Photo Attachment Filename (Optional)
              </label>
              <input
                id="inc-attach"
                type="text"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                placeholder="e.g. gate_b_thermal_capture.jpg"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="inc-client-vis"
                type="checkbox"
                checked={clientVisible}
                onChange={(e) => setClientVisible(e.target.checked)}
                className="rounded border-slate-300"
              />
              <label htmlFor="inc-client-vis" className="text-slate-700">
                Publish summary to Client Portal for owning client
              </label>
            </div>
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
              Incident & Escalation Register ({visibleIncidents.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {visibleIncidents.map((inc) => {
              const site = state.sites.find((s) => s.id === inc.siteId);
              return (
                <div key={inc.id} className="p-5 hover:bg-slate-50">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="font-bold text-[#0B192C]">
                      {inc.type} ·{' '}
                      <span
                        className={
                          inc.severity === 'Critical' || inc.severity === 'High'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }
                      >
                        {inc.severity} Severity
                      </span>
                    </div>
                    <div className="font-mono text-slate-500">
                      Status: <strong className="text-slate-900">{inc.status}</strong> ·{' '}
                      {inc.occurredAt.replace('T', ' ').slice(0, 16)} UTC
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Site: {site?.siteName} · Reported by: {inc.reporterName} ·
                    Client-Visible: {inc.clientVisible ? 'Yes' : 'Internal Only'}
                  </p>
                  <p className="text-xs text-slate-800 mt-2 leading-relaxed">
                    {inc.description}
                  </p>
                  {inc.attachments.length > 0 && (
                    <p className="text-[11px] font-mono text-slate-500 mt-2">
                      Attachments: {inc.attachments.join(', ')}
                    </p>
                  )}
                  {canLog && inc.status !== 'Resolved' && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                      {inc.status === 'Open' && (
                        <button
                          type="button"
                          onClick={() =>
                            onEscalateIncident(inc.id, 'Under Supervisor Review')
                          }
                          className="px-3 py-1 border border-slate-300 rounded text-slate-800 hover:bg-slate-100 cursor-pointer"
                        >
                          Route to Supervisor Review
                        </button>
                      )}
                      {inc.status !== 'Escalated to Command' && (
                        <button
                          type="button"
                          onClick={() =>
                            onEscalateIncident(inc.id, 'Escalated to Command')
                          }
                          className="px-3 py-1 bg-red-800 text-white font-semibold rounded hover:bg-red-900 cursor-pointer"
                        >
                          Escalate to Operation Manager / Director
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onResolveIncident(inc.id)}
                        className="px-3 py-1 bg-[#0B192C] text-white font-semibold rounded hover:bg-[#0F2547] cursor-pointer"
                      >
                        Mark Resolved
                      </button>
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
