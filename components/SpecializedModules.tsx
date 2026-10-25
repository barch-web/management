'use client';

import React, { useState } from 'react';
import {
  Truck,
  Camera,
  FileSpreadsheet,
  Building,
  BarChart3,
  Database,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Shield,
} from 'lucide-react';
import {
  Role,
  ServiceLine,
  ALL_SERVICE_LINES,
  hasPermission,
  canExportReports,
  filterSitesByRLS,
  filterShiftsByRLS,
  filterIncidentsByRLS,
  filterInvoicesByRLS,
  filterCCTVJobsByRLS,
} from '@/lib/rbac';
import { validateInvoiceInput, type UserAccount } from '@/lib/auth-logic';
import { SUPABASE_SQL_SCHEMA_AND_RLS } from '@/lib/supabase-schema';
import type {
  SystemState,
  CITJobRecord,
  CCTVJobRecord,
  InvoiceRecord,
  ExpenseRecord,
} from '@/lib/seed-data';

/* ============================================================================
   5.7 CIT & VALUABLE TRANSPORT MODULE
   ============================================================================ */
export function CITTransportModule({
  currentUser,
  state,
  onCreateCITJob,
  onAdvanceCITStatus,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateCITJob: (job: Omit<CITJobRecord, 'id'>) => void;
  onAdvanceCITStatus: (jobId: string, custodianName: string) => void;
}) {
  const canEdit = hasPermission(currentUser.role, 'cit_transport', 'edit');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [serviceLine, setServiceLine] = useState<
    ServiceLine.CASH_IN_TRANSIT | ServiceLine.VALUABLE_TRANSPORT
  >(ServiceLine.CASH_IN_TRANSIT);
  const [vehicle, setVehicle] = useState(
    'AV-ARMOR-06 (B6 Ballistic Mercedes Sprinter)'
  );
  const [valueCategory, setValueCategory] = useState<
    CITJobRecord['valueCategory']
  >('Tier-1 High Value ($5M+)');

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.trim() || !dropoff.trim()) return;
    const code = `CIT-LON-${Math.floor(8850 + Math.random() * 140)}`;
    onCreateCITJob({
      jobCode: code,
      clientId: 'client-1',
      serviceLine,
      pickup: pickup.trim(),
      dropoff: dropoff.trim(),
      crewIds: ['usr-grd-1', 'usr-sup-1'],
      crewNames: ['Liam Mercer (Custodian)', 'David Keller (Commander)'],
      vehicle,
      valueCategory,
      status: 'Scheduled',
      scheduledAt: new Date().toISOString(),
      chainOfCustody: [
        {
          timestamp: new Date().toISOString(),
          checkpoint: 'Manifest Registered & Tamper-Evident Cassette Sealed',
          custodian: currentUser.fullName,
          sealCode: `SL-${Math.floor(100000 + Math.random() * 899999)}-A`,
          verified: true,
        },
      ],
    });
    setPickup('');
    setDropoff('');
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-mono text-slate-500">
          ARMORED FLEET DISPATCH · BULLION & CURRENCY CHAIN OF CUSTODY
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
          Cash-in-Transit (CIT) & Valuable Transport Operations
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {canEdit && (
          <form
            onSubmit={handleAddJob}
            className="lg:col-span-4 border border-slate-200 rounded bg-white p-6 space-y-4 text-xs"
          >
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Schedule Armored Transport Convoy
            </h2>
            <div>
              <label
                htmlFor="cit-service"
                className="block font-semibold text-slate-800 mb-1"
              >
                Transport Division
              </label>
              <select
                id="cit-service"
                value={serviceLine}
                onChange={(e) =>
                  setServiceLine(
                    e.target.value as
                      | ServiceLine.CASH_IN_TRANSIT
                      | ServiceLine.VALUABLE_TRANSPORT
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                <option value={ServiceLine.CASH_IN_TRANSIT}>
                  Cash-in-Transit (CIT)
                </option>
                <option value={ServiceLine.VALUABLE_TRANSPORT}>
                  Valuable Transport
                </option>
              </select>
            </div>
            <div>
              <label
                htmlFor="cit-pickup"
                className="block font-semibold text-slate-800 mb-1"
              >
                Origin / Vault Pickup Point
              </label>
              <input
                id="cit-pickup"
                type="text"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="e.g. Apex Central Clearing Vault (EC2R)"
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="cit-dropoff"
                className="block font-semibold text-slate-800 mb-1"
              >
                Destination / Receiving Vault
              </label>
              <input
                id="cit-dropoff"
                type="text"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                placeholder="e.g. Canary Wharf Sovereign Depository (E14)"
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="cit-vehicle"
                className="block font-semibold text-slate-800 mb-1"
              >
                Armored Vehicle Unit
              </label>
              <input
                id="cit-vehicle"
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="cit-value"
                className="block font-semibold text-slate-800 mb-1"
              >
                Value & Insurance Category
              </label>
              <select
                id="cit-value"
                value={valueCategory}
                onChange={(e) =>
                  setValueCategory(
                    e.target.value as CITJobRecord['valueCategory']
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                <option value="Tier-1 High Value ($5M+)">
                  Tier-1 High Value ($5M+)
                </option>
                <option value="Tier-2 Commercial ($1M–$5M)">
                  Tier-2 Commercial ($1M–$5M)
                </option>
                <option value="Tier-3 Retail Bullion/Cash (<$1M)">
                  Tier-3 Retail Bullion/Cash (&lt;$1M)
                </option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B192C] hover:bg-[#0F2547] text-white font-semibold rounded cursor-pointer"
            >
              Dispatch CIT Manifest
            </button>
          </form>
        )}

        <div
          className={`${
            canEdit ? 'lg:col-span-8' : 'lg:col-span-12'
          } space-y-4`}
        >
          {state.citJobs.map((job) => (
            <div
              key={job.id}
              className="border border-slate-200 rounded bg-white p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-slate-500">
                    {job.jobCode} · {job.serviceLine} · {job.valueCategory}
                  </p>
                  <h3 className="font-display text-base font-bold text-[#0B192C] mt-0.5">
                    {job.pickup} → {job.dropoff}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Vehicle: <span className="font-mono">{job.vehicle}</span> ·
                    Crew: {job.crewNames.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-[#0B192C]">
                    Status: {job.status}
                  </span>
                  {job.status !== 'Completed' && (
                    <button
                      type="button"
                      onClick={() =>
                        onAdvanceCITStatus(job.id, currentUser.fullName)
                      }
                      className="px-3 py-1.5 bg-[#0B192C] text-white text-xs font-semibold rounded hover:bg-[#0F2547] cursor-pointer whitespace-nowrap"
                    >
                      Verify Seal & Advance Stage
                    </button>
                  )}
                </div>
              </div>

              {/* Chain of Custody Log */}
              <div className="border-t border-slate-200 pt-3">
                <p className="text-[11px] font-mono font-semibold text-slate-600 mb-2">
                  CHAIN-OF-CUSTODY & SEAL VERIFICATION LOG
                </p>
                <div className="space-y-1.5">
                  {job.chainOfCustody.map((step, idx) => (
                    <div
                      key={idx}
                      className="text-xs flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-1.5 rounded border border-slate-200"
                    >
                      <span>
                        <strong>{step.checkpoint}</strong> · Custodian:{' '}
                        {step.custodian}
                      </span>
                      <span className="font-mono text-slate-600">
                        Seal: {step.sealCode} ·{' '}
                        {step.timestamp.replace('T', ' ').slice(0, 16)} UTC
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5.8 CCTV INSTALLATION & SURVEILLANCE MODULE
   ============================================================================ */
export function CCTVSurveillanceModule({
  currentUser,
  state,
  onCreateCCTVJob,
  onAdvanceCCTVJob,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateCCTVJob: (job: Omit<CCTVJobRecord, 'id'>) => void;
  onAdvanceCCTVJob: (jobId: string) => void;
}) {
  const rlsCtx = {
    userId: currentUser.id,
    role: currentUser.role,
    clientId: currentUser.clientId,
    assignedSiteIds: currentUser.assignedSiteIds,
  };
  const visibleJobs = filterCCTVJobsByRLS(state.cctvJobs, rlsCtx);
  const canEdit = hasPermission(currentUser.role, 'cctv_surveillance', 'edit');

  const [siteId, setSiteId] = useState(state.sites[0]?.id || 'site-5');
  const [jobType, setJobType] = useState<CCTVJobRecord['jobType']>(
    'Preventive Maintenance'
  );
  const [equipment, setEquipment] = useState(
    '4x Axis P3268-LVE 4K Dome Cameras, 1x Managed PoE+ Switch'
  );
  const [technicalNotes, setTechnicalNotes] = useState('');

  const handleAddCCTV = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateCCTVJob({
      jobCode: `SURV-${Math.floor(510 + Math.random() * 89)}`,
      siteId,
      technicianId: 'usr-tech-1',
      technicianName: 'Vikram Patel',
      jobType,
      status: 'Assigned',
      equipmentUsed: equipment
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      technicalNotes:
        technicalNotes.trim() ||
        'Scheduled optical alignment and NVR retention check.',
      scheduledDate: '2026-10-28',
    });
    setTechnicalNotes('');
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-mono text-slate-500">
          OPTICAL SURVEILLANCE MATRIX · NVR INVENTORY · TECHNICIAN SIGN-OFF
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
          CCTV Installation, Maintenance & Site Surveillance Status
        </h1>
      </div>

      {/* Site Camera Health Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {state.sites.slice(0, 4).map((site) => (
          <div
            key={site.id}
            className="p-4 border border-slate-200 rounded bg-white text-xs"
          >
            <p className="font-bold text-[#0B192C] truncate">{site.siteName}</p>
            <p className="font-mono text-slate-600 mt-1">
              Active Cameras: <strong>{site.activeCameras}</strong>
            </p>
            <p className="font-mono mt-0.5 text-slate-500">
              System Status: <strong>{site.cctvStatus}</strong>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {canEdit && (
          <form
            onSubmit={handleAddCCTV}
            className="lg:col-span-4 border border-slate-200 rounded bg-white p-6 space-y-4 text-xs"
          >
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Assign CCTV Technical Work Order
            </h2>
            <div>
              <label
                htmlFor="cctv-site"
                className="block font-semibold text-slate-800 mb-1"
              >
                Target Site
              </label>
              <select
                id="cctv-site"
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
                htmlFor="cctv-type"
                className="block font-semibold text-slate-800 mb-1"
              >
                Job Classification
              </label>
              <select
                id="cctv-type"
                value={jobType}
                onChange={(e) =>
                  setJobType(e.target.value as CCTVJobRecord['jobType'])
                }
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                <option value="New Installation">New Installation</option>
                <option value="Preventive Maintenance">
                  Preventive Maintenance
                </option>
                <option value="Emergency Repair">Emergency Repair</option>
                <option value="Firmware & NVR Audit">
                  Firmware & NVR Audit
                </option>
              </select>
            </div>
            <div>
              <label
                htmlFor="cctv-equip"
                className="block font-semibold text-slate-800 mb-1"
              >
                Hardware & Equipment Inventory Allocated
              </label>
              <input
                id="cctv-equip"
                type="text"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="cctv-notes"
                className="block font-semibold text-slate-800 mb-1"
              >
                Site Technical Notes
              </label>
              <textarea
                id="cctv-notes"
                rows={2}
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                placeholder="NVR rack location, VLAN ID, camera preset notes..."
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B192C] hover:bg-[#0F2547] text-white font-semibold rounded cursor-pointer"
            >
              Create CCTV Work Order
            </button>
          </form>
        )}

        <div
          className={`${
            canEdit ? 'lg:col-span-8' : 'lg:col-span-12'
          } border border-slate-200 rounded bg-white overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Technician Job Assignments & Equipment Inventory ({visibleJobs.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {visibleJobs.map((job) => {
              const site = state.sites.find((s) => s.id === job.siteId);
              return (
                <div
                  key={job.id}
                  className="p-5 flex flex-wrap items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 max-w-2xl">
                    <p className="font-mono text-slate-500">
                      {job.jobCode} · {job.jobType} · Scheduled:{' '}
                      {job.scheduledDate}
                    </p>
                    <h3 className="font-display text-sm font-bold text-[#0B192C]">
                      {site?.siteName}
                    </h3>
                    <p className="text-slate-700">
                      Technician: <strong>{job.technicianName}</strong> ·
                      Equipment: {job.equipmentUsed.join(' · ')}
                    </p>
                    <p className="text-slate-600">{job.technicalNotes}</p>
                    {job.signedOffBy && (
                      <p className="font-mono text-emerald-700">
                        Completion Sign-Off: {job.signedOffBy}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="font-mono font-bold text-[#0B192C]">
                      {job.status}
                    </div>
                    {canEdit && job.status !== 'Completed' && (
                      <button
                        type="button"
                        onClick={() => onAdvanceCCTVJob(job.id)}
                        className="px-3 py-1.5 bg-[#0B192C] text-white font-semibold rounded hover:bg-[#0F2547] cursor-pointer whitespace-nowrap"
                      >
                        {job.status === 'Pending Sign-Off'
                          ? 'Complete & Sign Off'
                          : 'Advance Job Status'}
                      </button>
                    )}
                  </div>
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
   5.9 ACCOUNTING & INVOICING MODULE
   ============================================================================ */
export function AccountingInvoicingModule({
  currentUser,
  state,
  onCreateInvoice,
  onMarkInvoicePaid,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateInvoice: (inv: Omit<InvoiceRecord, 'id'>) => void;
  onMarkInvoicePaid: (invId: string) => void;
}) {
  const canView = hasPermission(
    currentUser.role,
    'accounting_invoicing',
    'view',
    state.rbacConfig
  );
  const canEdit = hasPermission(
    currentUser.role,
    'accounting_invoicing',
    'edit',
    state.rbacConfig
  );

  const [clientId, setClientId] = useState(state.clients[0]?.id || 'client-1');
  const [serviceLine, setServiceLine] = useState<ServiceLine>(
    ServiceLine.MANNED_GUARDING
  );
  const [amount, setAmount] = useState('25000');
  const [dueDate, setDueDate] = useState('2026-11-30');
  const [billingPeriod, setBillingPeriod] = useState(
    'November 2026 Contracted Security Retainer'
  );
  const [error, setError] = useState<string | null>(null);

  if (!canView) {
    return (
      <div className="p-8 border border-amber-200 rounded bg-amber-50 text-amber-900">
        <h2 className="font-display text-lg font-bold">
          Financial Module Restricted by RBAC Policy
        </h2>
        <p className="text-sm mt-1">
          Your role ({currentUser.role}) is currently configured without access
          to Accounting & Invoicing. A Director can adjust Operation Manager
          financial visibility in User & Role Management.
        </p>
      </div>
    );
  }

  const handleAddInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = Number(amount);
    const check = validateInvoiceInput({
      clientId,
      amount: numAmount,
      dueDate,
    });
    if (!check.valid) {
      setError(check.error || 'Invalid invoice input.');
      return;
    }

    onCreateInvoice({
      invoiceNumber: `INV-2026-${Math.floor(1050 + Math.random() * 90)}`,
      clientId,
      serviceLine,
      amount: numAmount,
      status: 'Issued',
      issuedDate: '2026-10-25',
      dueDate,
      billingPeriod: billingPeriod.trim() || 'Contracted Security Services',
    });
    setAmount('25000');
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500">
            CLIENT INVOICING · EXPENSE LEDGER · ATTENDANCE-LINKED PAYROLL SUPPORT
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
            Accounting, Client Invoicing & Payroll Support Data
          </h1>
        </div>
        <span className="text-xs font-mono text-slate-600">
          Access Tier: {canEdit ? 'Edit / Admin' : 'Read-Only View'}
        </span>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {canEdit && (
          <form
            onSubmit={handleAddInvoice}
            className="lg:col-span-4 border border-slate-200 rounded bg-white p-6 space-y-4 text-xs"
            noValidate
          >
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Issue New Client Invoice
            </h2>
            <div>
              <label
                htmlFor="inv-client"
                className="block font-semibold text-slate-800 mb-1"
              >
                Client Account
              </label>
              <select
                id="inv-client"
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
                htmlFor="inv-service"
                className="block font-semibold text-slate-800 mb-1"
              >
                Contracted Service Line
              </label>
              <select
                id="inv-service"
                value={serviceLine}
                onChange={(e) => setServiceLine(e.target.value as ServiceLine)}
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
                htmlFor="inv-amount"
                className="block font-semibold text-slate-800 mb-1"
              >
                Amount (£ GBP)
              </label>
              <input
                id="inv-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="inv-due"
                className="block font-semibold text-slate-800 mb-1"
              >
                Due Date
              </label>
              <input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="inv-period"
                className="block font-semibold text-slate-800 mb-1"
              >
                Service Summary / Billing Period
              </label>
              <input
                id="inv-period"
                type="text"
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B192C] hover:bg-[#0F2547] text-white font-semibold rounded cursor-pointer"
            >
              Generate & Issue Invoice
            </button>
          </form>
        )}

        <div
          className={`${
            canEdit ? 'lg:col-span-8' : 'lg:col-span-12'
          } space-y-6`}
        >
          {/* Invoices Table */}
          <div className="border border-slate-200 rounded bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-display text-sm font-bold text-[#0B192C]">
                Client Invoices Ledger ({state.invoices.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Invoice & Client</th>
                    <th className="py-2.5 px-4">Service Line</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {state.invoices.map((inv) => {
                    const cl = state.clients.find((c) => c.id === inv.clientId);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-[#0B192C]">
                            {inv.invoiceNumber}
                          </div>
                          <div className="text-slate-600">{cl?.companyName}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <div>{inv.serviceLine}</div>
                          <div className="text-slate-500">{inv.billingPeriod}</div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                          {inv.dueDate}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          £{inv.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className="font-semibold text-slate-900">
                            {inv.status}
                          </span>
                          {canEdit && inv.status !== 'Paid' && (
                            <button
                              type="button"
                              onClick={() => onMarkInvoicePaid(inv.id)}
                              className="ml-2 px-2 py-0.5 bg-[#0B192C] text-white text-[11px] rounded cursor-pointer"
                            >
                              Mark Paid
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

          {/* Payroll Support Data pulled from Shift Attendance (Section 5.9) */}
          <div className="border border-slate-200 rounded bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-display text-sm font-bold text-[#0B192C]">
                Payroll-Support Data (Verified Hours Pulled from Guard Attendance)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Employee & Badge</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4 text-right">Verified Shift Hours</th>
                    <th className="py-2.5 px-4 text-right">Contract Hourly Rate</th>
                    <th className="py-2.5 px-4 text-right">Gross Payroll Support Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {state.employees.map((emp) => {
                    const empShifts = state.shifts.filter(
                      (s) =>
                        s.guardId === emp.userId &&
                        (s.status === 'Completed' ||
                          s.status === 'Active / On-Post')
                    );
                    const verifiedHours =
                      empShifts.reduce((sum, s) => sum + s.hoursLogged, 0) || 40;
                    const grossPay = verifiedHours * emp.hourlyRate;
                    return (
                      <tr key={emp.id}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {emp.fullName} ({emp.badgeNumber})
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{emp.role}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {verifiedHours} hrs
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          £{emp.hourlyRate.toFixed(2)}/hr
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-[#0B192C]">
                          £{grossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
    </div>
  );
}

/* ============================================================================
   5.10 CLIENT PORTAL (RESTRICTED EXTERNAL VIEW)
   ============================================================================ */
export function ClientPortalModule({
  currentUser,
  state,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
}) {
  const effectiveClientId = currentUser.clientId || 'client-1';
  const clientRecord = state.clients.find((c) => c.id === effectiveClientId);
  const clientSites = state.sites.filter(
    (s) => s.clientId === effectiveClientId
  );
  const clientSiteIds = clientSites.map((s) => s.id);

  const rlsCtx = {
    userId: currentUser.id,
    role: Role.CLIENT,
    clientId: effectiveClientId,
    assignedSiteIds: clientSiteIds,
  };

  const clientShifts = filterShiftsByRLS(state.shifts, rlsCtx);
  const clientIncidents = filterIncidentsByRLS(state.incidents, rlsCtx);
  const clientInvoices = filterInvoicesByRLS(state.invoices, rlsCtx);

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-mono text-slate-500">
          SUPABASE RLS ISOLATED CLIENT PORTAL · CLIENT_ID = {effectiveClientId}
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
          {clientRecord?.companyName} — Contracted Security Services Portal
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Restricted external client view: displays only your contracted sites,
          assigned guard coverage, CCTV monitoring status, property incident
          summaries, and invoices addressed to your organization.
        </p>
      </div>

      {/* Contracted Sites & CCTV Monitoring */}
      <div className="border border-slate-200 rounded bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-sm font-bold text-[#0B192C]">
            Contracted Sites, Guard Coverage & CCTV Surveillance Telemetry ({clientSites.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-200">
          {clientSites.map((site) => (
            <div
              key={site.id}
              className="p-5 flex flex-wrap items-center justify-between gap-4 text-xs"
            >
              <div>
                <p className="font-mono text-slate-500">{site.serviceType}</p>
                <h3 className="font-display text-base font-bold text-[#0B192C] mt-0.5">
                  {site.siteName}
                </h3>
                <p className="text-slate-600 mt-0.5">{site.address}</p>
              </div>
              <div className="text-right font-mono tabular-nums space-y-1">
                <div className="font-bold text-slate-900">
                  Assigned Guard Coverage: {site.requiredGuards} Posts Active
                </div>
                <div className="text-slate-600">
                  CCTV Monitoring: {site.cctvStatus} ({site.activeCameras} Cameras)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client-Visible Incident Summaries */}
        <div className="border border-slate-200 rounded bg-white">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Property Incident Summaries ({clientIncidents.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {clientIncidents.map((inc) => {
              const site = clientSites.find((s) => s.id === inc.siteId);
              return (
                <div key={inc.id} className="p-4 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>
                      {inc.type} · {site?.siteName}
                    </span>
                    <span className="font-mono text-slate-500">{inc.status}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{inc.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Client Invoices & Service Summaries */}
        <div className="border border-slate-200 rounded bg-white">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-display text-sm font-bold text-[#0B192C]">
              Invoices & Service Summaries ({clientInvoices.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {clientInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-mono font-bold text-[#0B192C]">
                    {inv.invoiceNumber} · {inv.serviceLine}
                  </p>
                  <p className="text-slate-600 mt-0.5">{inv.billingPeriod}</p>
                  <p className="font-mono text-slate-500 mt-0.5">
                    Due: {inv.dueDate}
                  </p>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <p className="text-sm font-bold text-slate-900">
                    £{inv.amount.toLocaleString()}
                  </p>
                  <p className="text-slate-600">{inv.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Guard Schedule Summary */}
      <div className="border border-slate-200 rounded bg-white">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-sm font-bold text-[#0B192C]">
            Active Guard Roster Coverage for Your Sites ({clientShifts.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-200 text-xs">
          {clientShifts.map((sh) => {
            const site = clientSites.find((s) => s.id === sh.siteId);
            return (
              <div
                key={sh.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-900">
                    {site?.siteName}
                  </span>{' '}
                  · {sh.postAssignment}
                </div>
                <div className="font-mono text-slate-600">
                  Officer: {sh.guardName} · {sh.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5.11 REPORTS, ANALYTICS & SUPABASE RLS SCHEMA MODULE
   ============================================================================ */
export function ReportsAndSupabaseModule({
  currentUser,
  state,
  initialTab = 'reports',
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  initialTab?: 'reports' | 'supabase';
}) {
  const [tab, setTab] = useState<'reports' | 'supabase'>(initialTab);
  const [copied, setCopied] = useState(false);

  const completedOrActiveShifts = state.shifts.filter(
    (s) => s.status === 'Completed' || s.status === 'Active / On-Post'
  ).length;
  const attendanceRate = state.shifts.length
    ? ((completedOrActiveShifts / state.shifts.length) * 100).toFixed(1)
    : '100.0';

  const exportAllowed = canExportReports(currentUser.role);

  const handleDownloadCSV = () => {
    const rows = [
      ['Service Line', 'Sites Count', 'Billed Revenue (GBP)', 'Open Incidents'],
      ...ALL_SERVICE_LINES.map((sl) => {
        const sitesCount = state.sites.filter((s) => s.serviceType === sl).length;
        const rev = state.invoices
          .filter((i) => i.serviceLine === sl)
          .reduce((sum, i) => sum + i.amount, 0);
        const siteIds = state.sites
          .filter((s) => s.serviceType === sl)
          .map((s) => s.id);
        const incCount = state.incidents.filter((i) =>
          siteIds.includes(i.siteId)
        ).length;
        return [sl, String(sitesCount), String(rev), String(incCount)];
      }),
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aegis-vanguard-operational-kpis.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySQL = async () => {
    await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA_AND_RLS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500">
            EXECUTIVE ANALYTICS · CSV/PDF EXPORT · SUPABASE POSTGRESQL RLS DDL
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
            Operational KPIs, Service Line Revenue & Supabase RLS Schema
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={`px-3.5 py-2 text-xs font-semibold rounded cursor-pointer ${
              tab === 'reports'
                ? 'bg-[#0B192C] text-white'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Operational KPIs & Reports
          </button>
          <button
            type="button"
            onClick={() => setTab('supabase')}
            className={`px-3.5 py-2 text-xs font-semibold rounded cursor-pointer ${
              tab === 'supabase'
                ? 'bg-[#0B192C] text-white'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Supabase Schema & RLS Policies
          </button>
          {exportAllowed && (
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 bg-[#0B192C] hover:bg-[#0F2547] text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export KPI Report (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {tab === 'reports' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Guard Attendance & Verification Rate</p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                {attendanceRate}%
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">CIT & CCTV Job Completion Rate</p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                96.4%
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Total Incidents Logged</p>
              <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                {state.incidents.length}
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500">Total Billed Across 7 Service Lines</p>
              <p className="text-2xl font-bold text-[#0B192C] font-mono tabular-nums mt-1">
                £
                {state.invoices
                  .reduce((s, i) => s + i.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-display text-sm font-bold text-[#0B192C]">
                Performance & Revenue Breakdown Across All 7 Security Business Lines
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Security Service Line</th>
                    <th className="py-2.5 px-4 text-right">Active Contracted Sites</th>
                    <th className="py-2.5 px-4 text-right">Assigned Guards</th>
                    <th className="py-2.5 px-4 text-right">Logged Incidents</th>
                    <th className="py-2.5 px-4 text-right">Billed Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ALL_SERVICE_LINES.map((sl) => {
                    const slSites = state.sites.filter(
                      (s) => s.serviceType === sl
                    );
                    const guardsCount = slSites.reduce(
                      (sum, s) => sum + s.requiredGuards,
                      0
                    );
                    const siteIds = slSites.map((s) => s.id);
                    const incs = state.incidents.filter((i) =>
                      siteIds.includes(i.siteId)
                    ).length;
                    const rev = state.invoices
                      .filter((i) => i.serviceLine === sl)
                      .reduce((sum, i) => sum + i.amount, 0);
                    return (
                      <tr key={sl} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-[#0B192C]">
                          {sl}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {slSites.length}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {guardsCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {incs}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          £{rev.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded bg-[#060D1A] text-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-[#0B192C] flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                Supabase PostgreSQL Schema & Row-Level Security (RLS) Policies
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Matches Section 4 & Section 7: 15 tables, helper functions (
                <code>public.current_user_role()</code>,{' '}
                <code>public.is_account_admin()</code>,{' '}
                <code>public.current_client_id()</code>), and strict RLS policies.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySQL}
              className="px-3 py-1.5 bg-white text-[#0B192C] text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied SQL!' : 'Copy Full SQL Migration'}</span>
            </button>
          </div>
          <pre className="p-5 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
            {SUPABASE_SQL_SCHEMA_AND_RLS}
          </pre>
        </div>
      )}
    </div>
  );
}
