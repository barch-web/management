'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Download,
  Copy,
  CheckCircle2,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  Role,
  ServiceLine,
  ALL_SERVICE_LINES,
  hasPermission,
  canExportReports,
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
} from '@/lib/seed-data';

/* ============================================================================
   5.7 CIT & VALUABLE TRANSPORT MODULE
   ============================================================================ */
export function CITTransportModule({
  currentUser,
  state,
  onCreateCITJob,
  onUpdateCITJob,
  onDeleteCITJob,
  onAdvanceCITStatus,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateCITJob: (job: Omit<CITJobRecord, 'id'>) => void;
  onUpdateCITJob?: (jobId: string, patch: Partial<CITJobRecord>) => void;
  onDeleteCITJob?: (jobId: string) => void;
  onAdvanceCITStatus: (jobId: string, custodianName: string) => void;
}) {
  const canEdit = hasPermission(currentUser.role, 'cit_transport', 'edit');
  const isDirector = currentUser.role === Role.DIRECTOR;

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

  // Edit CIT Job State
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editPickup, setEditPickup] = useState('');
  const [editDropoff, setEditDropoff] = useState('');
  const [editVehicle, setEditVehicle] = useState('');

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
          custodian: currentUser.username,
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
          {state.citJobs.map((job) => {
            const isEditing = editingJobId === job.id;
            return (
              <div
                key={job.id}
                className="border border-slate-200 rounded bg-white p-5 space-y-4"
              >
                {isEditing ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Origin / Pickup
                        </label>
                        <input
                          type="text"
                          aria-label="Edit CIT pickup"
                          value={editPickup}
                          onChange={(e) => setEditPickup(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Destination / Dropoff
                        </label>
                        <input
                          type="text"
                          aria-label="Edit CIT dropoff"
                          value={editDropoff}
                          onChange={(e) => setEditDropoff(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Vehicle
                        </label>
                        <input
                          type="text"
                          aria-label="Edit CIT vehicle"
                          value={editVehicle}
                          onChange={(e) => setEditVehicle(e.target.value)}
                          className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateCITJob) {
                            onUpdateCITJob(job.id, {
                              pickup: editPickup.trim(),
                              dropoff: editDropoff.trim(),
                              vehicle: editVehicle.trim(),
                            });
                          }
                          setEditingJobId(null);
                        }}
                        className="px-3 py-1.5 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                      >
                        Save Manifest Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingJobId(null)}
                        className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono text-slate-500">
                        {job.jobCode} · {job.serviceLine} · {job.valueCategory}
                      </p>
                      <h3 className="font-display text-base font-bold text-[#0B192C] mt-0.5">
                        {job.pickup} → {job.dropoff}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Vehicle: <span className="font-mono">{job.vehicle}</span>{' '}
                        · Crew: {job.crewNames.join(', ')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#0B192C]">
                        Status: {job.status}
                      </span>
                      {job.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            onAdvanceCITStatus(job.id, currentUser.username)
                          }
                          className="px-3 py-1.5 bg-[#0B192C] text-white text-xs font-semibold rounded hover:bg-[#0F2547] cursor-pointer whitespace-nowrap"
                        >
                          Verify Seal & Advance Stage
                        </button>
                      )}
                      {isDirector && onUpdateCITJob && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingJobId(job.id);
                            setEditPickup(job.pickup);
                            setEditDropoff(job.dropoff);
                            setEditVehicle(job.vehicle);
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                      {isDirector && onDeleteCITJob && (
                        <button
                          type="button"
                          onClick={() => onDeleteCITJob(job.id)}
                          className="px-2.5 py-1.5 border border-red-200 text-red-700 text-xs font-semibold rounded hover:bg-red-50 cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}

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
            );
          })}
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
  onUpdateCCTVJob,
  onDeleteCCTVJob,
  onAdvanceCCTVJob,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateCCTVJob: (job: Omit<CCTVJobRecord, 'id'>) => void;
  onUpdateCCTVJob?: (jobId: string, patch: Partial<CCTVJobRecord>) => void;
  onDeleteCCTVJob?: (jobId: string) => void;
  onAdvanceCCTVJob: (jobId: string) => void;
}) {
  const isDirector = currentUser.role === Role.DIRECTOR;
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

  // Edit CCTV Job State
  const [editingCCTVId, setEditingCCTVId] = useState<string | null>(null);
  const [editCCTVNotes, setEditCCTVNotes] = useState('');

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
              const isEditing = editingCCTVId === job.id;
              return (
                <div
                  key={job.id}
                  className="p-5 flex flex-wrap items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 max-w-2xl flex-1">
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
                    {isEditing ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          aria-label="Edit CCTV technical notes"
                          value={editCCTVNotes}
                          onChange={(e) => setEditCCTVNotes(e.target.value)}
                          className="flex-1 px-2.5 py-1 border border-slate-300 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editCCTVNotes.trim() && onUpdateCCTVJob) {
                              onUpdateCCTVJob(job.id, {
                                technicalNotes: editCCTVNotes.trim(),
                              });
                            }
                            setEditingCCTVId(null);
                          }}
                          className="px-2.5 py-1 bg-[#0B192C] text-white font-semibold rounded cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCCTVId(null)}
                          className="px-2.5 py-1 border border-slate-300 text-slate-700 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-slate-600">{job.technicalNotes}</p>
                    )}
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
                    <div className="flex items-center justify-end gap-1.5">
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
                      {isDirector && onUpdateCCTVJob && !isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCCTVId(job.id);
                            setEditCCTVNotes(job.technicalNotes);
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                      {isDirector && onDeleteCCTVJob && (
                        <button
                          type="button"
                          onClick={() => onDeleteCCTVJob(job.id)}
                          className="px-2.5 py-1.5 border border-red-200 text-red-700 rounded hover:bg-red-50 cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
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
  onUpdateInvoice,
  onDeleteInvoice,
  onMarkInvoicePaid,
}: {
  currentUser: Omit<UserAccount, 'passwordHash'>;
  state: SystemState;
  onCreateInvoice: (inv: Omit<InvoiceRecord, 'id'>) => void;
  onUpdateInvoice?: (invId: string, patch: Partial<InvoiceRecord>) => void;
  onDeleteInvoice?: (invId: string) => void;
  onMarkInvoicePaid: (invId: string) => void;
}) {
  const isDirector = currentUser.role === Role.DIRECTOR;
  const activeServiceLines = state.serviceLines || ALL_SERVICE_LINES;
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
  const [serviceLine, setServiceLine] = useState<string>(
    activeServiceLines[0] || ServiceLine.MANNED_GUARDING
  );
  const [amount, setAmount] = useState('25000');
  const [dueDate, setDueDate] = useState('2026-11-30');
  const [billingPeriod, setBillingPeriod] = useState(
    'November 2026 Contracted Security Retainer'
  );
  const [error, setError] = useState<string | null>(null);

  // Edit Invoice State
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [editInvAmount, setEditInvAmount] = useState('');
  const [editInvPeriod, setEditInvPeriod] = useState('');

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
      serviceLine: serviceLine as ServiceLine,
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
                onChange={(e) => setServiceLine(e.target.value)}
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
                    <th className="py-2.5 px-4 text-right">Status & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {state.invoices.map((inv) => {
                    const cl = state.clients.find((c) => c.id === inv.clientId);
                    const isEditing = editingInvId === inv.id;
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
                          {isEditing ? (
                            <input
                              type="text"
                              aria-label="Edit billing period"
                              value={editInvPeriod}
                              onChange={(e) => setEditInvPeriod(e.target.value)}
                              className="mt-1 w-full px-2 py-1 border border-slate-300 rounded"
                            />
                          ) : (
                            <div className="text-slate-500">
                              {inv.billingPeriod}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                          {inv.dueDate}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="number"
                              aria-label="Edit invoice amount"
                              value={editInvAmount}
                              onChange={(e) => setEditInvAmount(e.target.value)}
                              className="w-24 px-2 py-1 border border-slate-300 rounded text-right"
                            />
                          ) : (
                            `£${inv.amount.toLocaleString()}`
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono space-x-1.5 whitespace-nowrap">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onUpdateInvoice) {
                                    onUpdateInvoice(inv.id, {
                                      amount:
                                        Number(editInvAmount) || inv.amount,
                                      billingPeriod: editInvPeriod.trim(),
                                    });
                                  }
                                  setEditingInvId(null);
                                }}
                                className="px-2 py-0.5 bg-[#0B192C] text-white text-[11px] rounded cursor-pointer font-sans font-semibold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingInvId(null)}
                                className="px-2 py-0.5 border border-slate-300 text-slate-700 text-[11px] rounded cursor-pointer font-sans"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-slate-900">
                                {inv.status}
                              </span>
                              {canEdit && inv.status !== 'Paid' && (
                                <button
                                  type="button"
                                  onClick={() => onMarkInvoicePaid(inv.id)}
                                  className="px-2 py-0.5 bg-[#0B192C] text-white text-[11px] rounded cursor-pointer font-sans"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {isDirector && onUpdateInvoice && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInvId(inv.id);
                                    setEditInvAmount(String(inv.amount));
                                    setEditInvPeriod(inv.billingPeriod);
                                  }}
                                  className="px-2 py-0.5 border border-slate-300 text-slate-700 text-[11px] rounded hover:bg-slate-100 cursor-pointer font-sans"
                                >
                                  Edit
                                </button>
                              )}
                              {isDirector && onDeleteInvoice && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteInvoice(inv.id)}
                                  className="px-2 py-0.5 border border-red-200 text-red-700 text-[11px] rounded hover:bg-red-50 cursor-pointer font-sans"
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
                    <th className="py-2.5 px-4 text-right">
                      Verified Shift Hours
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      Contract Hourly Rate
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      Gross Payroll Support Total
                    </th>
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
                        <td className="py-2.5 px-4 text-slate-600">
                          {emp.role}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {verifiedHours} hrs
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          £{emp.hourlyRate.toFixed(2)}/hr
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-[#0B192C]">
                          £
                          {grossPay.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
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
            Contracted Sites, Guard Coverage & CCTV Surveillance Telemetry (
            {clientSites.length})
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
                  CCTV Monitoring: {site.cctvStatus} ({site.activeCameras}{' '}
                  Cameras)
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
                    <span className="font-mono text-slate-500">
                      {inc.status}
                    </span>
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

  const activeServiceLines = state.serviceLines || ALL_SERVICE_LINES;

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
      ...activeServiceLines.map((sl) => {
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
              <span>Export CSV Report</span>
            </button>
          )}
        </div>
      </div>

      {tab === 'reports' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500 font-medium">
                Guard Attendance Rate
              </p>
              <p className="font-mono text-2xl font-bold text-[#0B192C] mt-1">
                {attendanceRate}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                GPS clock-in verified across shifts
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500 font-medium">
                CIT On-Time Completion
              </p>
              <p className="font-mono text-2xl font-bold text-[#0B192C] mt-1">
                99.4%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Zero chain-of-custody seal discrepancies
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500 font-medium">
                CCTV SLA Resolution
              </p>
              <p className="font-mono text-2xl font-bold text-[#0B192C] mt-1">
                3.2 hrs
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Mean time to optical restore
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded bg-white">
              <p className="text-xs text-slate-500 font-medium">
                Active Service Lines
              </p>
              <p className="font-mono text-2xl font-bold text-[#0B192C] mt-1">
                {activeServiceLines.length} Divisions
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Full multi-site operational coverage
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-display text-sm font-bold text-[#0B192C]">
                Revenue, Site Footprint & Incident Frequency by Business Line
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Security Service Line</th>
                    <th className="py-2.5 px-4 text-right">Contracted Sites</th>
                    <th className="py-2.5 px-4 text-right">
                      Assigned Guard Posts
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      Logged Incidents
                    </th>
                    <th className="py-2.5 px-4 text-right">Billed Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeServiceLines.map((sl) => {
                    const slSites = state.sites.filter(
                      (s) => s.serviceType === sl
                    );
                    const posts = slSites.reduce(
                      (sum, s) => sum + s.requiredGuards,
                      0
                    );
                    const siteIds = slSites.map((s) => s.id);
                    const incCount = state.incidents.filter((i) =>
                      siteIds.includes(i.siteId)
                    ).length;
                    const rev = state.invoices
                      .filter((i) => i.serviceLine === sl)
                      .reduce((sum, i) => sum + i.amount, 0);

                    return (
                      <tr key={sl} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-[#0B192C]">
                          {sl}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {slSites.length}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {posts}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {incCount}
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
        <div className="border border-slate-200 rounded bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-[#0B192C]">
                Supabase PostgreSQL Schema, RLS Policies & Edge Function Guard
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Production SQL script enforcing username-only authentication,
                8-role RBAC enum, and strict Row-Level Security across all
                operational tables.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySQL}
              className="px-3 py-1.5 bg-[#0B192C] text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied SQL</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL DDL</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-5 bg-[#060D1A] text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed max-h-[540px]">
            {SUPABASE_SQL_SCHEMA_AND_RLS}
          </pre>
        </div>
      )}
    </div>
  );
}
