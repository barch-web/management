import { Role, canManageAccounts, ALL_ROLES } from './rbac';

export type AccountStatus = 'active' | 'deactivated';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  clientId?: string;
  assignedSiteIds?: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorUsername: string;
  actorRole: Role;
  action:
    | 'ACCOUNT_CREATED'
    | 'ROLE_CHANGED'
    | 'ACCOUNT_DEACTIVATED'
    | 'ACCOUNT_REACTIVATED'
    | 'ACCOUNT_DELETED'
    | 'PASSWORD_RESET'
    | 'SELF_PASSWORD_UPDATED'
    | 'FINANCE_ACCESS_CONFIGURED';
  targetId: string;
  targetUsername: string;
  details: string;
  timestamp: string;
}

const INTERNAL_AUTH_DOMAIN = 'auth.aegis-vanguard.internal';

/**
 * Section 2: Usernames must be unique and are the sole identifier used at login.
 * Map each username internally to a system-generated email for Supabase Auth
 * without ever exposing or requiring email at sign-in.
 */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsernameFormat(username: string): {
  valid: boolean;
  error?: string;
} {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return { valid: false, error: 'Username is required.' };
  }
  if (normalized.includes('@')) {
    return {
      valid: false,
      error: 'Sign-in uses username only. Do not enter an email address.',
    };
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
    return {
      valid: false,
      error:
        'Username must be 3–32 characters and contain only lowercase letters, numbers, dots, hyphens, or underscores.',
    };
  }
  return { valid: true };
}

export function usernameToInternalEmail(username: string): string {
  const normalized = normalizeUsername(username);
  return `${normalized}@${INTERNAL_AUTH_DOMAIN}`;
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  if (!password || password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long.',
    };
  }
  return { valid: true };
}

/**
 * Deterministic cryptographic hash simulation for local/unit verification
 * alongside Supabase Auth's native bcrypt hashing. Never stores plaintext.
 */
export function hashPassword(password: string, usernameSalt: string): string {
  const normalizedSalt = normalizeUsername(usernameSalt);
  let h1 = 0xdeadbeef ^ normalizedSalt.length;
  let h2 = 0x41c6ce57 ^ password.length;
  const combined = `${normalizedSalt}::aegis_vanguard_v1::${password}`;
  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `$aegis2b$12$${Buffer.from(normalizedSalt).toString('hex').slice(0, 16)}$${hex1}${hex2}`;
}

export function verifyPassword(
  password: string,
  usernameSalt: string,
  storedHash: string
): boolean {
  if (!password || !storedHash) return false;
  const computed = hashPassword(password, usernameSalt);
  return computed === storedHash;
}

export interface AuthenticateResult {
  success: boolean;
  user?: Omit<UserAccount, 'passwordHash'>;
  internalAuthEmail?: string;
  redirectModule?: string;
  error?: string;
}

export function authenticateWithUsernamePassword(
  accounts: UserAccount[],
  rawUsername: string,
  password: string
): AuthenticateResult {
  const formatCheck = validateUsernameFormat(rawUsername);
  if (!formatCheck.valid) {
    return { success: false, error: formatCheck.error };
  }
  if (!password) {
    return { success: false, error: 'Password is required.' };
  }

  const normalized = normalizeUsername(rawUsername);
  const account = accounts.find(
    (acc) => normalizeUsername(acc.username) === normalized
  );

  if (!account) {
    return { success: false, error: 'Invalid username or password.' };
  }

  if (account.status !== 'active') {
    return {
      success: false,
      error:
        'Account is deactivated. Contact a Director or Operation Manager to restore access.',
    };
  }

  const isPasswordValid = verifyPassword(
    password,
    account.username,
    account.passwordHash
  );
  if (!isPasswordValid) {
    return { success: false, error: 'Invalid username or password.' };
  }

  const { passwordHash: _removed, ...safeUser } = account;
  return {
    success: true,
    user: safeUser,
    internalAuthEmail: usernameToInternalEmail(account.username),
    redirectModule: 'dashboard',
  };
}

export interface CreateAccountInput {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  role: Role;
  clientId?: string;
  assignedSiteIds?: string[];
}

export function provisionUserAccount(
  actor: Pick<UserAccount, 'id' | 'username' | 'role'>,
  existingAccounts: UserAccount[],
  input: CreateAccountInput,
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  account?: UserAccount;
  auditEntry?: AuditLogEntry;
  error?: string;
} {
  // Enforce Section 3: Only Director or Operation Manager can create accounts
  if (!canManageAccounts(actor.role)) {
    return {
      success: false,
      error:
        'Forbidden: Only Director or Operation Manager accounts may create user accounts.',
    };
  }

  const usernameValidation = validateUsernameFormat(input.username);
  if (!usernameValidation.valid) {
    return { success: false, error: usernameValidation.error };
  }

  const passwordValidation = validatePasswordStrength(input.password);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.error };
  }

  if (!input.fullName || !input.fullName.trim()) {
    return { success: false, error: 'Full name is required.' };
  }

  if (!input.phone || !input.phone.trim()) {
    return { success: false, error: 'Phone number is required.' };
  }

  if (!ALL_ROLES.includes(input.role)) {
    return { success: false, error: 'Invalid system role selected.' };
  }

  const normalizedUsername = normalizeUsername(input.username);
  const duplicate = existingAccounts.some(
    (u) => normalizeUsername(u.username) === normalizedUsername
  );
  if (duplicate) {
    return {
      success: false,
      error: `Username "${normalizedUsername}" is already assigned to an existing account.`,
    };
  }

  const newAccount: UserAccount = {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: normalizedUsername,
    passwordHash: hashPassword(input.password, normalizedUsername),
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    role: input.role,
    status: 'active',
    clientId: input.clientId,
    assignedSiteIds: input.assignedSiteIds ?? [],
    createdAt: nowIso,
  };

  const auditEntry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'ACCOUNT_CREATED',
    targetId: newAccount.id,
    targetUsername: newAccount.username,
    details: `Created account "${newAccount.username}" (${newAccount.fullName}) with role ${newAccount.role}`,
    timestamp: nowIso,
  };

  return {
    success: true,
    account: newAccount,
    auditEntry,
  };
}

export function changeUserRole(
  actor: Pick<UserAccount, 'id' | 'username' | 'role'>,
  target: UserAccount,
  newRole: Role,
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  updatedAccount?: UserAccount;
  auditEntry?: AuditLogEntry;
  error?: string;
} {
  if (!canManageAccounts(actor.role)) {
    return {
      success: false,
      error:
        'Forbidden: Only Director or Operation Manager accounts may change system roles.',
    };
  }

  if (!ALL_ROLES.includes(newRole)) {
    return { success: false, error: 'Invalid target role.' };
  }

  const previousRole = target.role;
  const updatedAccount: UserAccount = {
    ...target,
    role: newRole,
  };

  const auditEntry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'ROLE_CHANGED',
    targetId: target.id,
    targetUsername: target.username,
    details: `Changed role for "${target.username}" from ${previousRole} to ${newRole}`,
    timestamp: nowIso,
  };

  return {
    success: true,
    updatedAccount,
    auditEntry,
  };
}

export function setAccountStatus(
  actor: Pick<UserAccount, 'id' | 'username' | 'role'>,
  target: UserAccount,
  newStatus: AccountStatus,
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  updatedAccount?: UserAccount;
  auditEntry?: AuditLogEntry;
  error?: string;
} {
  if (!canManageAccounts(actor.role)) {
    return {
      success: false,
      error:
        'Forbidden: Only Director or Operation Manager accounts may activate or deactivate accounts.',
    };
  }

  if (actor.id === target.id && newStatus === 'deactivated') {
    return {
      success: false,
      error: 'Cannot deactivate your own active administrator account.',
    };
  }

  const updatedAccount: UserAccount = {
    ...target,
    status: newStatus,
  };

  const auditEntry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action:
      newStatus === 'deactivated'
        ? 'ACCOUNT_DEACTIVATED'
        : 'ACCOUNT_REACTIVATED',
    targetId: target.id,
    targetUsername: target.username,
    details: `${
      newStatus === 'deactivated' ? 'Deactivated' : 'Reactivated'
    } account "${target.username}"`,
    timestamp: nowIso,
  };

  return {
    success: true,
    updatedAccount,
    auditEntry,
  };
}

export function resetAccountPassword(
  actor: Pick<UserAccount, 'id' | 'username' | 'role'>,
  target: UserAccount,
  newPassword: string,
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  updatedAccount?: UserAccount;
  auditEntry?: AuditLogEntry;
  error?: string;
} {
  const isSelf = actor.id === target.id;
  if (!isSelf && !canManageAccounts(actor.role)) {
    return {
      success: false,
      error:
        'Forbidden: Only Director or Operation Manager accounts may reset another user’s password.',
    };
  }

  const pwCheck = validatePasswordStrength(newPassword);
  if (!pwCheck.valid) {
    return { success: false, error: pwCheck.error };
  }

  const updatedAccount: UserAccount = {
    ...target,
    passwordHash: hashPassword(newPassword, target.username),
  };

  const auditEntry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: isSelf ? 'SELF_PASSWORD_UPDATED' : 'PASSWORD_RESET',
    targetId: target.id,
    targetUsername: target.username,
    details: isSelf
      ? `User "${target.username}" updated their own password`
      : `Administrator "${actor.username}" reset password for "${target.username}"`,
    timestamp: nowIso,
  };

  return {
    success: true,
    updatedAccount,
    auditEntry,
  };
}

/**
 * Session inactivity helper (Section 9: expire and require re-login after inactivity)
 */
export function isSessionExpired(
  lastActivityTimestampMs: number,
  currentTimestampMs: number,
  maxInactivityMs: number = 30 * 60 * 1000 // 30 minutes default
): boolean {
  return currentTimestampMs - lastActivityTimestampMs > maxInactivityMs;
}

/**
 * Form Validation Helpers (Section 10: Data validation on shift times, incident fields, invoice amounts)
 */
export function validateShiftTimes(
  startTimeIso: string,
  endTimeIso: string
): { valid: boolean; error?: string } {
  if (!startTimeIso || !endTimeIso) {
    return { valid: false, error: 'Both shift start time and end time are required.' };
  }
  const startMs = Date.parse(startTimeIso);
  const endMs = Date.parse(endTimeIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return { valid: false, error: 'Invalid date/time format for shift schedule.' };
  }
  if (endMs <= startMs) {
    return { valid: false, error: 'Shift end time must be after shift start time.' };
  }
  const durationHours = (endMs - startMs) / (1000 * 60 * 60);
  if (durationHours > 16) {
    return {
      valid: false,
      error: 'Shift duration cannot exceed 16 continuous hours per guard safety policy.',
    };
  }
  return { valid: true };
}

export function validateIncidentReport(input: {
  siteId: string;
  type: string;
  description: string;
}): { valid: boolean; error?: string } {
  if (!input.siteId || !input.siteId.trim()) {
    return { valid: false, error: 'Incident site selection is required.' };
  }
  if (!input.type || !input.type.trim()) {
    return { valid: false, error: 'Incident classification type is required.' };
  }
  if (!input.description || input.description.trim().length < 10) {
    return {
      valid: false,
      error: 'Incident description must be at least 10 characters long.',
    };
  }
  return { valid: true };
}

export function validateInvoiceInput(input: {
  clientId: string;
  amount: number;
  dueDate: string;
}): { valid: boolean; error?: string } {
  if (!input.clientId || !input.clientId.trim()) {
    return { valid: false, error: 'Client selection is required for invoicing.' };
  }
  if (typeof input.amount !== 'number' || Number.isNaN(input.amount) || input.amount <= 0) {
    return { valid: false, error: 'Invoice amount must be a positive number greater than zero.' };
  }
  if (!input.dueDate || Number.isNaN(Date.parse(input.dueDate))) {
    return { valid: false, error: 'A valid invoice due date is required.' };
  }
  return { valid: true };
}
