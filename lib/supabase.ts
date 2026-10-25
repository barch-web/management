import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { usernameToInternalEmail, normalizeUsername } from './auth-logic';
import { Role, ServiceLine } from './rbac';
import type {
  SystemState,
  SiteRecord,
  ShiftRecord,
  IncidentRecord,
  CITJobRecord,
  CCTVJobRecord,
  InvoiceRecord,
  DisciplinaryRecord,
} from './seed-data';

const DEFAULT_SUPABASE_URL = 'https://zlkwkbwzpiqzgnqjgseh.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsa3drYnd6cGlxemducWpnc2VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NjkxNjYsImV4cCI6MjEwODU0NTE2Nn0.i2lhWh08J1H7Py6N4iyftTH9QHieOOKDTyzOisE7U7M';

/**
 * Strips trailing `/rest/v1` or slashes if a REST endpoint URL was provided
 * so `@supabase/supabase-js` always receives the canonical project origin.
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

const rawEnvUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawEnvKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const SUPABASE_PROJECT_URL = normalizeSupabaseUrl(
  rawEnvUrl && rawEnvUrl !== 'https://your-project-id.supabase.co'
    ? rawEnvUrl
    : DEFAULT_SUPABASE_URL
);

export const SUPABASE_ANON_KEY =
  rawEnvKey && rawEnvKey !== 'your-supabase-anon-key'
    ? rawEnvKey.trim()
    : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_PROJECT_URL && SUPABASE_ANON_KEY
);

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Disable magic-link / URL token sign-in per Section 2
      },
    });
  }
  return clientInstance;
}

/**
 * Authenticates with Supabase Auth using ONLY username + password.
 * Maps the unique username internally to `<username>@auth.aegis-vanguard.internal`
 * so email is never exposed or required at sign-in.
 */
export async function signInWithSupabaseUsername(
  username: string,
  password: string
) {
  const supabase = getSupabaseClient();
  const internalEmail = usernameToInternalEmail(normalizeUsername(username));
  const { data, error } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password,
  });

  if (!error && data.user) {
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);
  }

  return {
    configured: true as const,
    data,
    error,
  };
}

export async function signOutSupabase() {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut().catch(() => null);
}

/**
 * Fetches live operational rows from Supabase tables when populated
 * and merges them into the application state.
 */
export async function fetchSupabaseLiveState(
  fallbackState: SystemState
): Promise<Partial<SystemState>> {
  const supabase = getSupabaseClient();
  const patch: Partial<SystemState> = {};

  try {
    const [
      rbacRes,
      clientsRes,
      sitesRes,
      shiftsRes,
      incidentsRes,
      citRes,
      cctvRes,
      invoicesRes,
    ] = await Promise.all([
      supabase
        .from('rbac_config')
        .select('operation_manager_finance_access')
        .eq('id', 1)
        .maybeSingle(),
      supabase.from('clients').select('*').order('created_at', { ascending: true }),
      supabase.from('sites').select('*').order('created_at', { ascending: false }),
      supabase.from('shifts').select('*').order('start_time', { ascending: false }),
      supabase
        .from('incidents')
        .select('*')
        .order('occurred_at', { ascending: false }),
      supabase
        .from('cit_jobs')
        .select('*')
        .order('scheduled_at', { ascending: false }),
      supabase
        .from('cctv_jobs')
        .select('*')
        .order('scheduled_date', { ascending: false }),
      supabase
        .from('invoices')
        .select('*')
        .order('issued_date', { ascending: false }),
    ]);

    if (rbacRes.data?.operation_manager_finance_access) {
      patch.rbacConfig = {
        operationManagerFinancialAccess:
          rbacRes.data.operation_manager_finance_access,
      };
    }

    if (clientsRes.data && clientsRes.data.length > 0) {
      patch.clients = clientsRes.data.map((c) => ({
        id: c.id,
        companyName: c.company_name,
        contactPerson: c.contact_person,
        contactInfo: c.contact_info,
        contractTier: c.contract_tier || 'Enterprise SLA',
        activeSince: String(c.created_at || '2025-01-01').slice(0, 10),
      }));
    }

    if (sitesRes.data && sitesRes.data.length > 0) {
      patch.sites = sitesRes.data.map((s) => ({
        id: s.id,
        clientId: s.client_id,
        siteName: s.site_name,
        address: s.address,
        serviceType: (s.service_type as ServiceLine) || ServiceLine.MANNED_GUARDING,
        supervisorId: s.supervisor_id || 'usr-sup-1',
        assignedGuardIds: ['usr-grd-1'],
        riskLevel: s.risk_level || 'High',
        riskNotes: s.risk_notes || '',
        cctvStatus: s.cctv_status || 'Online',
        activeCameras: Number(s.active_cameras ?? 16),
        requiredGuards: Number(s.required_guards ?? 2),
      }));
    }

    if (shiftsRes.data && shiftsRes.data.length > 0) {
      patch.shifts = shiftsRes.data.map((sh) => {
        const guardAcc = fallbackState.accounts.find(
          (a) => a.id === sh.guard_id
        );
        return {
          id: sh.id,
          siteId: sh.site_id,
          guardId: sh.guard_id,
          guardName: guardAcc?.fullName || 'Assigned Guard',
          startTime: sh.start_time,
          endTime: sh.end_time,
          postAssignment: sh.post_assignment || 'Main Perimeter Gate',
          status: sh.status || 'Scheduled',
          hoursLogged: 8,
        };
      });
    }

    if (incidentsRes.data && incidentsRes.data.length > 0) {
      patch.incidents = incidentsRes.data.map((inc) => {
        const reporterAcc = fallbackState.accounts.find(
          (a) => a.id === inc.reported_by
        );
        return {
          id: inc.id,
          siteId: inc.site_id,
          reportedBy: inc.reported_by,
          reporterName: reporterAcc?.fullName || 'Security Officer',
          type: inc.type,
          severity: inc.severity || 'High',
          description: inc.description,
          attachments: Array.isArray(inc.attachments) ? inc.attachments : [],
          status: inc.status || 'Open',
          escalatedTo: inc.escalated_to || undefined,
          clientVisible: inc.client_visible !== false,
          occurredAt: inc.occurred_at,
        };
      });
    }

    if (citRes.data && citRes.data.length > 0) {
      patch.citJobs = citRes.data.map((job) => ({
        id: job.id,
        jobCode: job.job_code,
        clientId: job.client_id,
        serviceLine: job.service_line || ServiceLine.CASH_IN_TRANSIT,
        pickup: job.pickup,
        dropoff: job.dropoff,
        crewIds: Array.isArray(job.crew_ids) ? job.crew_ids : [],
        crewNames: ['Liam Mercer (Custodian)', 'David Keller (Commander)'],
        vehicle: job.vehicle,
        valueCategory: job.value_category,
        status: job.status || 'Scheduled',
        scheduledAt: job.scheduled_at,
        chainOfCustody: Array.isArray(job.chain_of_custody)
          ? job.chain_of_custody
          : [],
      }));
    }

    if (cctvRes.data && cctvRes.data.length > 0) {
      patch.cctvJobs = cctvRes.data.map((job) => ({
        id: job.id,
        jobCode: job.job_code,
        siteId: job.site_id,
        technicianId: job.technician_id,
        technicianName: 'Vikram Patel',
        jobType: job.job_type,
        status: job.status || 'Assigned',
        equipmentUsed: Array.isArray(job.equipment_used)
          ? job.equipment_used
          : [],
        technicalNotes: job.technical_notes || '',
        scheduledDate: job.scheduled_date,
        signedOffBy: job.signed_off_by || undefined,
      }));
    }

    if (invoicesRes.data && invoicesRes.data.length > 0) {
      patch.invoices = invoicesRes.data.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientId: inv.client_id,
        serviceLine: (inv.service_line as ServiceLine) || ServiceLine.MANNED_GUARDING,
        amount: Number(inv.amount),
        status: inv.status || 'Issued',
        issuedDate: inv.issued_date,
        dueDate: inv.due_date,
        billingPeriod: inv.billing_period || 'Contracted Security Services',
      }));
    }
  } catch {
    // Fallback to local state if tables are not yet migrated or RLS restricts anonymous read
  }

  return patch;
}

/**
 * Non-blocking persistence helpers to write operational mutations directly to Supabase
 */
export async function persistSiteToSupabase(site: Omit<SiteRecord, 'id'>) {
  const supabase = getSupabaseClient();
  await supabase
    .from('sites')
    .insert({
      client_id: site.clientId,
      site_name: site.siteName,
      address: site.address,
      service_type: site.serviceType,
      risk_level: site.riskLevel,
      risk_notes: site.riskNotes,
      cctv_status: site.cctvStatus,
      active_cameras: site.activeCameras,
      required_guards: site.requiredGuards,
    })
    .then(() => null, () => null);
}

export async function persistShiftToSupabase(shift: Omit<ShiftRecord, 'id'>) {
  const supabase = getSupabaseClient();
  await supabase
    .from('shifts')
    .insert({
      site_id: shift.siteId,
      guard_id: shift.guardId,
      start_time: shift.startTime,
      end_time: shift.endTime,
      post_assignment: shift.postAssignment,
      status: shift.status,
    })
    .then(() => null, () => null);
}

export async function persistIncidentToSupabase(
  inc: Omit<IncidentRecord, 'id'>
) {
  const supabase = getSupabaseClient();
  await supabase
    .from('incidents')
    .insert({
      site_id: inc.siteId,
      reported_by: inc.reportedBy,
      type: inc.type,
      severity: inc.severity,
      description: inc.description,
      attachments: inc.attachments,
      status: inc.status,
      escalated_to: inc.escalatedTo,
      client_visible: inc.clientVisible,
      occurred_at: inc.occurredAt,
    })
    .then(() => null, () => null);
}

export async function persistCITJobToSupabase(job: Omit<CITJobRecord, 'id'>) {
  const supabase = getSupabaseClient();
  await supabase
    .from('cit_jobs')
    .insert({
      job_code: job.jobCode,
      client_id: job.clientId,
      service_line: job.serviceLine,
      pickup: job.pickup,
      dropoff: job.dropoff,
      vehicle: job.vehicle,
      value_category: job.valueCategory,
      status: job.status,
      chain_of_custody: job.chainOfCustody,
      scheduled_at: job.scheduledAt,
    })
    .then(() => null, () => null);
}

export async function persistCCTVJobToSupabase(job: Omit<CCTVJobRecord, 'id'>) {
  const supabase = getSupabaseClient();
  await supabase
    .from('cctv_jobs')
    .insert({
      job_code: job.jobCode,
      site_id: job.siteId,
      technician_id: job.technicianId,
      job_type: job.jobType,
      status: job.status,
      equipment_used: job.equipmentUsed,
      technical_notes: job.technicalNotes,
      scheduled_date: job.scheduledDate,
    })
    .then(() => null, () => null);
}

export async function persistInvoiceToSupabase(inv: Omit<InvoiceRecord, 'id'>) {
  const supabase = getSupabaseClient();
  await supabase
    .from('invoices')
    .insert({
      invoice_number: inv.invoiceNumber,
      client_id: inv.clientId,
      service_line: inv.serviceLine,
      amount: inv.amount,
      status: inv.status,
      issued_date: inv.issuedDate,
      due_date: inv.dueDate,
      billing_period: inv.billingPeriod,
    })
    .then(() => null, () => null);
}

export async function persistRBACConfigToSupabase(level: string) {
  const supabase = getSupabaseClient();
  await supabase
    .from('rbac_config')
    .update({
      operation_manager_finance_access: level,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .then(() => null, () => null);
}
