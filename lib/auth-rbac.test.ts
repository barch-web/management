import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Role,
  ALL_ROLES,
  getPermissionLevel,
  hasPermission,
  canManageAccounts,
  canExportReports,
  getAllowedModulesForRole,
  filterSitesByRLS,
  filterShiftsByRLS,
  filterIncidentsByRLS,
  filterInvoicesByRLS,
  filterCCTVJobsByRLS,
} from './rbac';
import {
  normalizeUsername,
  validateUsernameFormat,
  usernameToInternalEmail,
  hashPassword,
  verifyPassword,
  authenticateWithUsernamePassword,
  provisionUserAccount,
  updateUserAccount,
  deleteUserAccount,
  changeUserRole,
  setAccountStatus,
  resetAccountPassword,
  isSessionExpired,
  validateShiftTimes,
  validateIncidentReport,
  validateInvoiceInput,
  type UserAccount,
} from './auth-logic';

const makeTestAccounts = (): UserAccount[] => [
  {
    id: 'usr-dir-1',
    username: 'director.vance',
    passwordHash: hashPassword('Sentinel#2026', 'director.vance'),
    fullName: 'Marcus Vance',
    phone: '+44 20 7946 0101',
    role: Role.DIRECTOR,
    status: 'active',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr-ops-1',
    username: 'ops.hale',
    passwordHash: hashPassword('Sentinel#2026', 'ops.hale'),
    fullName: 'Elena Hale',
    phone: '+44 20 7946 0102',
    role: Role.OPERATION_MANAGER,
    status: 'active',
    createdAt: '2026-01-02T08:00:00Z',
  },
  {
    id: 'usr-sup-1',
    username: 'sup.keller',
    passwordHash: hashPassword('Sentinel#2026', 'sup.keller'),
    fullName: 'David Keller',
    phone: '+44 20 7946 0103',
    role: Role.SUPERVISOR,
    status: 'active',
    assignedSiteIds: ['site-1', 'site-2'],
    createdAt: '2026-01-03T08:00:00Z',
  },
  {
    id: 'usr-hr-1',
    username: 'hr.okafor',
    passwordHash: hashPassword('Sentinel#2026', 'hr.okafor'),
    fullName: 'Amara Okafor',
    phone: '+44 20 7946 0105',
    role: Role.HR_MANAGER,
    status: 'active',
    createdAt: '2026-01-04T08:00:00Z',
  },
  {
    id: 'usr-grd-1',
    username: 'guard.mercer',
    passwordHash: hashPassword('Sentinel#2026', 'guard.mercer'),
    fullName: 'Liam Mercer',
    phone: '+44 20 7946 0106',
    role: Role.GUARD,
    status: 'active',
    assignedSiteIds: ['site-1'],
    createdAt: '2026-01-05T08:00:00Z',
  },
  {
    id: 'usr-cli-1',
    username: 'client.apex',
    passwordHash: hashPassword('Sentinel#2026', 'client.apex'),
    fullName: 'Victoria Sterling (Apex Vaults)',
    phone: '+44 20 7946 0108',
    role: Role.CLIENT,
    status: 'active',
    clientId: 'client-1',
    assignedSiteIds: ['site-1'],
    createdAt: '2026-01-06T08:00:00Z',
  },
];

test('Username validation enforces unique non-email identifiers only', () => {
  assert.equal(normalizeUsername('  Director.Vance '), 'director.vance');
  assert.equal(validateUsernameFormat('director.vance').valid, true);
  assert.equal(validateUsernameFormat('guard_01-north').valid, true);

  // Reject email format at sign-in
  const emailAttempt = validateUsernameFormat('director@company.com');
  assert.equal(emailAttempt.valid, false);
  assert.match(emailAttempt.error || '', /username only/i);

  // Reject too short or empty
  assert.equal(validateUsernameFormat('').valid, false);
  assert.equal(validateUsernameFormat('ab').valid, false);

  // Internal Supabase Auth mapping never leaks external email input
  assert.equal(
    usernameToInternalEmail('Director.Vance'),
    'director.vance@auth.aegis-vanguard.internal'
  );
});

test('Password hashing and verification never store plaintext and verify accurately', () => {
  const hash = hashPassword('Sentinel#2026', 'director.vance');
  assert.notEqual(hash, 'Sentinel#2026');
  assert.ok(hash.startsWith('$aegis2b$12$'));
  assert.equal(verifyPassword('Sentinel#2026', 'director.vance', hash), true);
  assert.equal(verifyPassword('WrongPassword!', 'director.vance', hash), false);
  assert.equal(verifyPassword('Sentinel#2026', 'other.user', hash), false);
});

test('Authentication succeeds for active user and rejects wrong password, email input, or deactivated account', () => {
  const accounts = makeTestAccounts();

  // Valid login
  const okRes = authenticateWithUsernamePassword(
    accounts,
    'DIRECTOR.VANCE',
    'Sentinel#2026'
  );
  assert.equal(okRes.success, true);
  assert.equal(okRes.user?.username, 'director.vance');
  assert.equal(okRes.user?.role, Role.DIRECTOR);
  assert.equal(
    okRes.internalAuthEmail,
    'director.vance@auth.aegis-vanguard.internal'
  );

  // Wrong password
  const badPw = authenticateWithUsernamePassword(
    accounts,
    'director.vance',
    'InvalidPass123'
  );
  assert.equal(badPw.success, false);
  assert.match(badPw.error || '', /Invalid username or password/i);

  // Email rejected at login
  const emailLogin = authenticateWithUsernamePassword(
    accounts,
    'director.vance@company.com',
    'Sentinel#2026'
  );
  assert.equal(emailLogin.success, false);

  // Deactivated user blocked
  accounts[4].status = 'deactivated';
  const deactivatedRes = authenticateWithUsernamePassword(
    accounts,
    'guard.mercer',
    'Sentinel#2026'
  );
  assert.equal(deactivatedRes.success, false);
  assert.match(deactivatedRes.error || '', /deactivated/i);
});

test('Account provisioning is strictly restricted to Director and Operation Manager', () => {
  const accounts = makeTestAccounts();
  const director = accounts[0];
  const opsManager = accounts[1];
  const supervisor = accounts[2];
  const hrManager = accounts[3];
  const guard = accounts[4];

  // Director can create account
  const dirCreate = provisionUserAccount(director, accounts, {
    username: 'guard.thorne',
    password: 'StrongPassword#99',
    fullName: 'Marcus Thorne',
    phone: '+44 20 7946 0199',
    role: Role.GUARD,
  });
  assert.equal(dirCreate.success, true);
  assert.equal(dirCreate.account?.username, 'guard.thorne');
  assert.equal(dirCreate.auditEntry?.action, 'ACCOUNT_CREATED');
  assert.equal(dirCreate.auditEntry?.actorId, director.id);

  // Operation Manager can create account
  const opsCreate = provisionUserAccount(opsManager, accounts, {
    username: 'tech.patel',
    password: 'StrongPassword#99',
    fullName: 'Vikram Patel',
    phone: '+44 20 7946 0200',
    role: Role.CCTV_TECHNICIAN,
  });
  assert.equal(opsCreate.success, true);
  assert.equal(opsCreate.account?.role, Role.CCTV_TECHNICIAN);

  // Duplicate username rejected
  const dupCreate = provisionUserAccount(director, accounts, {
    username: 'guard.mercer',
    password: 'StrongPassword#99',
    fullName: 'Duplicate Guard',
    phone: '+44 20 7946 0201',
    role: Role.GUARD,
  });
  assert.equal(dupCreate.success, false);
  assert.match(dupCreate.error || '', /already assigned/i);

  // HR Manager, Supervisor, Guard, Accountant, CCTV Tech, Client CANNOT create accounts
  for (const unauthorizedActor of [supervisor, hrManager, guard, accounts[5]]) {
    const res = provisionUserAccount(unauthorizedActor, accounts, {
      username: `unauth.${unauthorizedActor.role.toLowerCase().slice(0, 4)}`,
      password: 'StrongPassword#99',
      fullName: 'Unauthorized Attempt',
      phone: '+44 20 7946 0202',
      role: Role.GUARD,
    });
    assert.equal(res.success, false);
    assert.match(res.error || '', /Forbidden/i);
  }
});

test('Role changes, account deactivation, and password resets enforce RBAC and log audit trail', () => {
  const accounts = makeTestAccounts();
  const director = accounts[0];
  const supervisor = accounts[2];
  const guard = accounts[4];

  // Supervisor cannot change guard role
  const unauthRoleChange = changeUserRole(supervisor, guard, Role.SUPERVISOR);
  assert.equal(unauthRoleChange.success, false);

  // Director can promote guard to supervisor
  const validRoleChange = changeUserRole(director, guard, Role.SUPERVISOR);
  assert.equal(validRoleChange.success, true);
  assert.equal(validRoleChange.updatedAccount?.role, Role.SUPERVISOR);
  assert.equal(validRoleChange.auditEntry?.action, 'ROLE_CHANGED');

  // Cannot deactivate self
  const selfDeactivate = setAccountStatus(director, director, 'deactivated');
  assert.equal(selfDeactivate.success, false);

  // Director can deactivate guard
  const validDeactivate = setAccountStatus(director, guard, 'deactivated');
  assert.equal(validDeactivate.success, true);
  assert.equal(validDeactivate.updatedAccount?.status, 'deactivated');
  assert.equal(validDeactivate.auditEntry?.action, 'ACCOUNT_DEACTIVATED');

  // Guard can update their own password, but cannot reset Supervisor's password
  const selfPw = resetAccountPassword(guard, guard, 'NewGuardPass#2026');
  assert.equal(selfPw.success, true);
  assert.equal(selfPw.auditEntry?.action, 'SELF_PASSWORD_UPDATED');

  const unauthPwReset = resetAccountPassword(guard, supervisor, 'HackedPass#2026');
  assert.equal(unauthPwReset.success, false);

  // Director can reset another user's password
  const adminPwReset = resetAccountPassword(director, guard, 'AdminReset#2026');
  assert.equal(adminPwReset.success, true);
  assert.equal(adminPwReset.auditEntry?.action, 'PASSWORD_RESET');

  // Director can edit user account details and delete another user account
  const editRes = updateUserAccount(
    director,
    guard,
    {
      username: 'guard.mercer.prime',
      fullName: 'Liam Mercer Prime',
      phone: '+44 20 7946 0999',
    },
    accounts
  );
  assert.equal(editRes.success, true);
  assert.equal(editRes.updatedAccount?.username, 'guard.mercer.prime');
  assert.equal(editRes.auditEntry?.action, 'ACCOUNT_UPDATED');

  // Supervisor cannot delete accounts, Director can delete accounts (except own)
  const unauthDel = deleteUserAccount(supervisor, guard);
  assert.equal(unauthDel.success, false);
  const selfDel = deleteUserAccount(director, director);
  assert.equal(selfDel.success, false);
  const validDel = deleteUserAccount(director, guard);
  assert.equal(validDel.success, true);
  assert.equal(validDel.deletedId, guard.id);
  assert.equal(validDel.auditEntry?.action, 'ACCOUNT_DELETED');
});

test('Permissions Matrix accurately enforces module access across all 8 roles', () => {
  assert.equal(ALL_ROLES.length, 8);

  // Only Director and Operation Manager have users_roles access
  for (const role of ALL_ROLES) {
    const expectedAdmin =
      role === Role.DIRECTOR || role === Role.OPERATION_MANAGER;
    assert.equal(canManageAccounts(role), expectedAdmin);
    assert.equal(hasPermission(role, 'users_roles', 'view'), expectedAdmin);
  }

  // Operation Manager financial access is configurable (default: view)
  assert.equal(
    getPermissionLevel(Role.OPERATION_MANAGER, 'accounting_invoicing'),
    'view'
  );
  assert.equal(
    hasPermission(Role.OPERATION_MANAGER, 'accounting_invoicing', 'edit'),
    false
  );
  assert.equal(
    hasPermission(Role.OPERATION_MANAGER, 'accounting_invoicing', 'edit', {
      operationManagerFinancialAccess: 'admin',
    }),
    true
  );
  assert.equal(
    hasPermission(Role.OPERATION_MANAGER, 'accounting_invoicing', 'view', {
      operationManagerFinancialAccess: 'none',
    }),
    false
  );

  // Accountant can access accounting_invoicing and reports_analytics, but NOT scheduling or HR
  assert.equal(hasPermission(Role.ACCOUNTANT, 'accounting_invoicing', 'admin'), true);
  assert.equal(hasPermission(Role.ACCOUNTANT, 'scheduling_shifts', 'view'), false);
  assert.equal(hasPermission(Role.ACCOUNTANT, 'hr_employees', 'view'), false);

  // HR Manager can admin hr_employees, but cannot access users_roles or accounting_invoicing
  assert.equal(hasPermission(Role.HR_MANAGER, 'hr_employees', 'admin'), true);
  assert.equal(hasPermission(Role.HR_MANAGER, 'users_roles', 'view'), false);
  assert.equal(hasPermission(Role.HR_MANAGER, 'accounting_invoicing', 'view'), false);

  // Client can only access dashboard and client_portal
  const clientModules = getAllowedModulesForRole(Role.CLIENT);
  assert.deepEqual(clientModules, ['dashboard', 'client_portal']);

  // Export reports allowed only for Director, Operation Manager, Accountant
  assert.equal(canExportReports(Role.DIRECTOR), true);
  assert.equal(canExportReports(Role.OPERATION_MANAGER), true);
  assert.equal(canExportReports(Role.ACCOUNTANT), true);
  assert.equal(canExportReports(Role.SUPERVISOR), false);
  assert.equal(canExportReports(Role.GUARD), false);
});

test('Row-Level Security (RLS) filters isolate data per role and client ownership', () => {
  const sites = [
    { id: 'site-1', clientId: 'client-1', supervisorId: 'usr-sup-1' },
    { id: 'site-2', clientId: 'client-2', supervisorId: 'usr-sup-2' },
  ];
  const shifts = [
    { id: 'sh-1', siteId: 'site-1', guardId: 'usr-grd-1' },
    { id: 'sh-2', siteId: 'site-2', guardId: 'usr-grd-2' },
  ];
  const incidents = [
    { id: 'inc-1', siteId: 'site-1', reportedBy: 'usr-grd-1', clientVisible: true },
    { id: 'inc-2', siteId: 'site-1', reportedBy: 'usr-sup-1', clientVisible: false },
    { id: 'inc-3', siteId: 'site-2', reportedBy: 'usr-grd-2', clientVisible: true },
  ];
  const invoices = [
    { id: 'inv-1', clientId: 'client-1', amount: 14500 },
    { id: 'inv-2', clientId: 'client-2', amount: 22000 },
  ];
  const cctvJobs = [
    { id: 'cctv-1', siteId: 'site-1', technicianId: 'usr-tech-1' },
    { id: 'cctv-2', siteId: 'site-2', technicianId: 'usr-tech-2' },
  ];

  // Client 1 only sees client-1 sites, shifts on site-1, client-visible incidents on site-1, and client-1 invoices
  const clientCtx = {
    userId: 'usr-cli-1',
    role: Role.CLIENT,
    clientId: 'client-1',
    assignedSiteIds: ['site-1'],
  };
  assert.deepEqual(
    filterSitesByRLS(sites, clientCtx).map((s) => s.id),
    ['site-1']
  );
  assert.deepEqual(
    filterShiftsByRLS(shifts, clientCtx).map((s) => s.id),
    ['sh-1']
  );
  assert.deepEqual(
    filterIncidentsByRLS(incidents, clientCtx).map((i) => i.id),
    ['inc-1']
  );
  assert.deepEqual(
    filterInvoicesByRLS(invoices, clientCtx).map((i) => i.id),
    ['inv-1']
  );

  // Guard 1 only sees their own shifts and cannot see any invoices
  const guardCtx = {
    userId: 'usr-grd-1',
    role: Role.GUARD,
    assignedSiteIds: ['site-1'],
  };
  assert.deepEqual(
    filterShiftsByRLS(shifts, guardCtx).map((s) => s.id),
    ['sh-1']
  );
  assert.deepEqual(filterInvoicesByRLS(invoices, guardCtx), []);

  // CCTV Technician 1 only sees jobs assigned to usr-tech-1
  const techCtx = {
    userId: 'usr-tech-1',
    role: Role.CCTV_TECHNICIAN,
  };
  assert.deepEqual(
    filterCCTVJobsByRLS(cctvJobs, techCtx).map((j) => j.id),
    ['cctv-1']
  );
});

test('Session timeout and operational form validators catch invalid inputs', () => {
  const baseTime = 1_700_000_000_000;
  assert.equal(isSessionExpired(baseTime, baseTime + 10 * 60 * 1000), false);
  assert.equal(isSessionExpired(baseTime, baseTime + 35 * 60 * 1000), true);

  // Shift validation
  assert.equal(
    validateShiftTimes('2026-10-25T08:00:00Z', '2026-10-25T16:00:00Z').valid,
    true
  );
  assert.equal(
    validateShiftTimes('2026-10-25T16:00:00Z', '2026-10-25T08:00:00Z').valid,
    false
  );
  assert.equal(
    validateShiftTimes('2026-10-25T00:00:00Z', '2026-10-25T20:00:00Z').valid,
    false
  );

  // Incident validation
  assert.equal(
    validateIncidentReport({
      siteId: 'site-1',
      type: 'Perimeter Breach Attempt',
      description: 'Motion sensor triggered on Gate B; patrol dispatched.',
    }).valid,
    true
  );
  assert.equal(
    validateIncidentReport({ siteId: 'site-1', type: 'Breach', description: 'short' })
      .valid,
    false
  );

  // Invoice validation
  assert.equal(
    validateInvoiceInput({
      clientId: 'client-1',
      amount: 18500,
      dueDate: '2026-11-15',
    }).valid,
    true
  );
  assert.equal(
    validateInvoiceInput({ clientId: 'client-1', amount: -50, dueDate: '2026-11-15' })
      .valid,
    false
  );
});

test('Supabase URL normalization strips /rest/v1/ suffix accurately', async () => {
  const { normalizeSupabaseUrl, SUPABASE_PROJECT_URL, isSupabaseConfigured } =
    await import('./supabase');
  assert.equal(
    normalizeSupabaseUrl('https://zlkwkbwzpiqzgnqjgseh.supabase.co/rest/v1/'),
    'https://zlkwkbwzpiqzgnqjgseh.supabase.co'
  );
  assert.equal(
    SUPABASE_PROJECT_URL,
    'https://zlkwkbwzpiqzgnqjgseh.supabase.co'
  );
  assert.equal(isSupabaseConfigured, true);
});

