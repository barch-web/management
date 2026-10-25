export enum Role {
  DIRECTOR = 'Director',
  OPERATION_MANAGER = 'Operation Manager',
  SUPERVISOR = 'Supervisor',
  ACCOUNTANT = 'Accountant',
  HR_MANAGER = 'Human Resource Manager',
  GUARD = 'Guard',
  CCTV_TECHNICIAN = 'CCTV Technician',
  CLIENT = 'Client',
}

export const ALL_ROLES: Role[] = [
  Role.DIRECTOR,
  Role.OPERATION_MANAGER,
  Role.SUPERVISOR,
  Role.ACCOUNTANT,
  Role.HR_MANAGER,
  Role.GUARD,
  Role.CCTV_TECHNICIAN,
  Role.CLIENT,
];

export enum ServiceLine {
  MANNED_GUARDING = 'Manned Guarding',
  INDUSTRIAL_SECURITY = 'Industrial Security',
  CASH_IN_TRANSIT = 'Cash-in-Transit (CIT)',
  VALUABLE_TRANSPORT = 'Valuable Transport',
  CCTV_SURVEILLANCE = 'CCTV Installation & Surveillance',
  EVENT_SECURITY = 'Event Security',
  ASSET_STORAGE = 'Asset Storage & Protection',
}

export const ALL_SERVICE_LINES: ServiceLine[] = [
  ServiceLine.MANNED_GUARDING,
  ServiceLine.INDUSTRIAL_SECURITY,
  ServiceLine.CASH_IN_TRANSIT,
  ServiceLine.VALUABLE_TRANSPORT,
  ServiceLine.CCTV_SURVEILLANCE,
  ServiceLine.EVENT_SECURITY,
  ServiceLine.ASSET_STORAGE,
];

export type ModuleKey =
  | 'dashboard'
  | 'users_roles'
  | 'hr_employees'
  | 'scheduling_shifts'
  | 'sites_clients'
  | 'incidents'
  | 'cit_transport'
  | 'cctv_surveillance'
  | 'accounting_invoicing'
  | 'client_portal'
  | 'reports_analytics'
  | 'supabase_rls';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export interface RBACConfig {
  operationManagerFinancialAccess: PermissionLevel; // default: 'view', configurable by Director
}

export const DEFAULT_RBAC_CONFIG: RBACConfig = {
  operationManagerFinancialAccess: 'view',
};

const PERMISSION_WEIGHT: Record<PermissionLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  admin: 3,
};

/**
 * Core Permissions Matrix: Module x Role -> none / view / edit / admin
 * Enforced in both the UI and server/RLS policies.
 */
export const BASE_PERMISSIONS_MATRIX: Record<Role, Record<ModuleKey, PermissionLevel>> = {
  [Role.DIRECTOR]: {
    dashboard: 'admin',
    users_roles: 'admin',
    hr_employees: 'admin',
    scheduling_shifts: 'admin',
    sites_clients: 'admin',
    incidents: 'admin',
    cit_transport: 'admin',
    cctv_surveillance: 'admin',
    accounting_invoicing: 'admin',
    client_portal: 'admin',
    reports_analytics: 'admin',
    supabase_rls: 'admin',
  },
  [Role.OPERATION_MANAGER]: {
    dashboard: 'admin',
    users_roles: 'admin',
    hr_employees: 'view',
    scheduling_shifts: 'admin',
    sites_clients: 'admin',
    incidents: 'admin',
    cit_transport: 'admin',
    cctv_surveillance: 'admin',
    accounting_invoicing: 'view', // Configurable via RBACConfig
    client_portal: 'view',
    reports_analytics: 'admin',
    supabase_rls: 'admin',
  },
  [Role.SUPERVISOR]: {
    dashboard: 'view',
    users_roles: 'none',
    hr_employees: 'view',
    scheduling_shifts: 'edit',
    sites_clients: 'view',
    incidents: 'edit',
    cit_transport: 'view',
    cctv_surveillance: 'view',
    accounting_invoicing: 'none',
    client_portal: 'none',
    reports_analytics: 'view',
    supabase_rls: 'none',
  },
  [Role.ACCOUNTANT]: {
    dashboard: 'view',
    users_roles: 'none',
    hr_employees: 'none',
    scheduling_shifts: 'none',
    sites_clients: 'view',
    incidents: 'none',
    cit_transport: 'none',
    cctv_surveillance: 'none',
    accounting_invoicing: 'admin',
    client_portal: 'none',
    reports_analytics: 'edit',
    supabase_rls: 'none',
  },
  [Role.HR_MANAGER]: {
    dashboard: 'view',
    users_roles: 'none', // Cannot create login accounts or assign system roles
    hr_employees: 'admin',
    scheduling_shifts: 'view',
    sites_clients: 'view',
    incidents: 'view',
    cit_transport: 'none',
    cctv_surveillance: 'none',
    accounting_invoicing: 'none',
    client_portal: 'none',
    reports_analytics: 'view',
    supabase_rls: 'none',
  },
  [Role.GUARD]: {
    dashboard: 'view',
    users_roles: 'none',
    hr_employees: 'none',
    scheduling_shifts: 'edit', // Clock-in/out & view own roster
    sites_clients: 'none',
    incidents: 'edit', // Submit incident reports for their post
    cit_transport: 'none',
    cctv_surveillance: 'none',
    accounting_invoicing: 'none',
    client_portal: 'none',
    reports_analytics: 'none',
    supabase_rls: 'none',
  },
  [Role.CCTV_TECHNICIAN]: {
    dashboard: 'view',
    users_roles: 'none',
    hr_employees: 'none',
    scheduling_shifts: 'none',
    sites_clients: 'view',
    incidents: 'view',
    cit_transport: 'none',
    cctv_surveillance: 'edit', // Update job status, equipment inventory, technical notes
    accounting_invoicing: 'none',
    client_portal: 'none',
    reports_analytics: 'none',
    supabase_rls: 'none',
  },
  [Role.CLIENT]: {
    dashboard: 'view',
    users_roles: 'none',
    hr_employees: 'none',
    scheduling_shifts: 'none',
    sites_clients: 'none',
    incidents: 'none',
    cit_transport: 'none',
    cctv_surveillance: 'none',
    accounting_invoicing: 'none',
    client_portal: 'view', // Dedicated restricted client portal
    reports_analytics: 'none',
    supabase_rls: 'none',
  },
};

export function getPermissionLevel(
  role: Role,
  moduleKey: ModuleKey,
  config: RBACConfig = DEFAULT_RBAC_CONFIG
): PermissionLevel {
  if (role === Role.OPERATION_MANAGER && moduleKey === 'accounting_invoicing') {
    return config.operationManagerFinancialAccess;
  }
  return BASE_PERMISSIONS_MATRIX[role]?.[moduleKey] ?? 'none';
}

export function hasPermission(
  role: Role,
  moduleKey: ModuleKey,
  minimumRequired: PermissionLevel = 'view',
  config: RBACConfig = DEFAULT_RBAC_CONFIG
): boolean {
  const actual = getPermissionLevel(role, moduleKey, config);
  return PERMISSION_WEIGHT[actual] >= PERMISSION_WEIGHT[minimumRequired];
}

/**
 * Section 3 & 4: Only Director and Operation Manager may:
 * - Create new user accounts
 * - Assign or change a user's role
 * - Deactivate/reactivate or delete accounts
 * - Reset another user's password
 */
export function canManageAccounts(role: Role): boolean {
  return role === Role.DIRECTOR || role === Role.OPERATION_MANAGER;
}

export function canExportReports(role: Role): boolean {
  return (
    role === Role.DIRECTOR ||
    role === Role.OPERATION_MANAGER ||
    role === Role.ACCOUNTANT
  );
}

export function getDefaultRouteForRole(role: Role): ModuleKey {
  if (role === Role.CLIENT) {
    return 'dashboard';
  }
  return 'dashboard';
}

export function getAllowedModulesForRole(
  role: Role,
  config: RBACConfig = DEFAULT_RBAC_CONFIG
): ModuleKey[] {
  const allModules: ModuleKey[] = [
    'dashboard',
    'users_roles',
    'hr_employees',
    'scheduling_shifts',
    'sites_clients',
    'incidents',
    'cit_transport',
    'cctv_surveillance',
    'accounting_invoicing',
    'client_portal',
    'reports_analytics',
    'supabase_rls',
  ];
  return allModules.filter((mod) => hasPermission(role, mod, 'view', config));
}

/**
 * Row-Level Security (RLS) predicate helpers used both in application queries
 * and mirrored in PostgreSQL RLS policies.
 */
export interface RLSUserContext {
  userId: string;
  role: Role;
  clientId?: string;
  assignedSiteIds?: string[];
}

export function filterSitesByRLS<T extends { id: string; clientId: string; supervisorId?: string }>(
  sites: T[],
  ctx: RLSUserContext
): T[] {
  if (
    ctx.role === Role.DIRECTOR ||
    ctx.role === Role.OPERATION_MANAGER ||
    ctx.role === Role.HR_MANAGER ||
    ctx.role === Role.ACCOUNTANT ||
    ctx.role === Role.CCTV_TECHNICIAN
  ) {
    return sites;
  }
  if (ctx.role === Role.SUPERVISOR) {
    return sites.filter(
      (s) =>
        s.supervisorId === ctx.userId ||
        (ctx.assignedSiteIds ? ctx.assignedSiteIds.includes(s.id) : false)
    );
  }
  if (ctx.role === Role.GUARD) {
    return sites.filter((s) =>
      ctx.assignedSiteIds ? ctx.assignedSiteIds.includes(s.id) : false
    );
  }
  if (ctx.role === Role.CLIENT) {
    if (!ctx.clientId) return [];
    return sites.filter((s) => s.clientId === ctx.clientId);
  }
  return [];
}

export function filterShiftsByRLS<T extends { siteId: string; guardId: string }>(
  shifts: T[],
  ctx: RLSUserContext
): T[] {
  if (
    ctx.role === Role.DIRECTOR ||
    ctx.role === Role.OPERATION_MANAGER ||
    ctx.role === Role.HR_MANAGER
  ) {
    return shifts;
  }
  if (ctx.role === Role.SUPERVISOR) {
    return shifts.filter((sh) =>
      ctx.assignedSiteIds ? ctx.assignedSiteIds.includes(sh.siteId) : true
    );
  }
  if (ctx.role === Role.GUARD) {
    return shifts.filter((sh) => sh.guardId === ctx.userId);
  }
  if (ctx.role === Role.CLIENT) {
    return shifts.filter((sh) =>
      ctx.assignedSiteIds ? ctx.assignedSiteIds.includes(sh.siteId) : false
    );
  }
  return [];
}

export function filterIncidentsByRLS<
  T extends { siteId: string; reportedBy: string; clientVisible?: boolean }
>(incidents: T[], ctx: RLSUserContext): T[] {
  if (
    ctx.role === Role.DIRECTOR ||
    ctx.role === Role.OPERATION_MANAGER ||
    ctx.role === Role.HR_MANAGER ||
    ctx.role === Role.CCTV_TECHNICIAN
  ) {
    return incidents;
  }
  if (ctx.role === Role.SUPERVISOR) {
    return incidents.filter(
      (inc) =>
        inc.reportedBy === ctx.userId ||
        (ctx.assignedSiteIds ? ctx.assignedSiteIds.includes(inc.siteId) : true)
    );
  }
  if (ctx.role === Role.GUARD) {
    return incidents.filter(
      (inc) =>
        inc.reportedBy === ctx.userId ||
        (ctx.assignedSiteIds ? ctx.assignedSiteIds.includes(inc.siteId) : false)
    );
  }
  if (ctx.role === Role.CLIENT) {
    return incidents.filter(
      (inc) =>
        (ctx.assignedSiteIds ? ctx.assignedSiteIds.includes(inc.siteId) : false) &&
        inc.clientVisible !== false
    );
  }
  return [];
}

export function filterInvoicesByRLS<T extends { clientId: string }>(
  invoices: T[],
  ctx: RLSUserContext,
  config: RBACConfig = DEFAULT_RBAC_CONFIG
): T[] {
  if (ctx.role === Role.DIRECTOR || ctx.role === Role.ACCOUNTANT) {
    return invoices;
  }
  if (ctx.role === Role.OPERATION_MANAGER) {
    return hasPermission(Role.OPERATION_MANAGER, 'accounting_invoicing', 'view', config)
      ? invoices
      : [];
  }
  if (ctx.role === Role.CLIENT) {
    if (!ctx.clientId) return [];
    return invoices.filter((inv) => inv.clientId === ctx.clientId);
  }
  return [];
}

export function filterCCTVJobsByRLS<T extends { siteId: string; technicianId: string }>(
  jobs: T[],
  ctx: RLSUserContext
): T[] {
  if (
    ctx.role === Role.DIRECTOR ||
    ctx.role === Role.OPERATION_MANAGER ||
    ctx.role === Role.SUPERVISOR
  ) {
    return jobs;
  }
  if (ctx.role === Role.CCTV_TECHNICIAN) {
    return jobs.filter((job) => job.technicianId === ctx.userId);
  }
  if (ctx.role === Role.CLIENT) {
    return jobs.filter((job) =>
      ctx.assignedSiteIds ? ctx.assignedSiteIds.includes(job.siteId) : false
    );
  }
  return [];
}
