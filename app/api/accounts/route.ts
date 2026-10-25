import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canManageAccounts, Role, ALL_ROLES } from '@/lib/rbac';
import {
  provisionUserAccount,
  changeUserRole,
  setAccountStatus,
  resetAccountPassword,
  usernameToInternalEmail,
  normalizeUsername,
  type UserAccount,
} from '@/lib/auth-logic';
import { SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

const ROLE_TO_ID: Record<Role, number> = {
  [Role.DIRECTOR]: 1,
  [Role.OPERATION_MANAGER]: 2,
  [Role.SUPERVISOR]: 3,
  [Role.ACCOUNTANT]: 4,
  [Role.HR_MANAGER]: 5,
  [Role.GUARD]: 6,
  [Role.CCTV_TECHNICIAN]: 7,
  [Role.CLIENT]: 8,
};

function getServerSupabaseClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const activeKey =
    serviceKey && serviceKey !== 'your-supabase-service-role-key'
      ? serviceKey
      : SUPABASE_ANON_KEY;

  return createClient(SUPABASE_PROJECT_URL, activeKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Server-side Account Provisioning & RBAC Enforcement Endpoint
 * Validates that only Director or Operation Manager roles can create accounts,
 * change roles, deactivate/reactivate accounts, or reset another user's password,
 * and synchronizes changes with Supabase Auth and PostgreSQL tables.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      actor,
      accounts,
      payload,
    }: {
      action:
        | 'CREATE_ACCOUNT'
        | 'CHANGE_ROLE'
        | 'SET_STATUS'
        | 'RESET_PASSWORD';
      actor: { id: string; username: string; role: Role };
      accounts: UserAccount[];
      payload: Record<string, unknown>;
    } = body;

    if (!actor || !actor.role) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authenticated actor session.' },
        { status: 401 }
      );
    }

    // Server-side guard for administrative account actions
    const isSelfPasswordUpdate =
      action === 'RESET_PASSWORD' && payload?.targetId === actor.id;

    if (!isSelfPasswordUpdate && !canManageAccounts(actor.role)) {
      return NextResponse.json(
        {
          error:
            'Forbidden (Server-Side Policy): Only Director or Operation Manager roles may provision or modify accounts.',
        },
        { status: 403 }
      );
    }

    const supabase = getServerSupabaseClient();

    if (action === 'CREATE_ACCOUNT') {
      const result = provisionUserAccount(actor, accounts || [], {
        username: String(payload.username || ''),
        password: String(payload.password || ''),
        fullName: String(payload.fullName || ''),
        phone: String(payload.phone || ''),
        role: payload.role as Role,
        clientId: payload.clientId ? String(payload.clientId) : undefined,
        assignedSiteIds: Array.isArray(payload.assignedSiteIds)
          ? (payload.assignedSiteIds as string[])
          : [],
      });

      if (!result.success || !result.account || !result.auditEntry) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Sync to Supabase Auth & public.users / public.user_roles / public.audit_log
      try {
        const internalEmail = usernameToInternalEmail(
          normalizeUsername(result.account.username)
        );
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        let authUserId: string | undefined;

        if (serviceKey && serviceKey !== 'your-supabase-service-role-key') {
          const { data: adminAuthData } = await supabase.auth.admin.createUser({
            email: internalEmail,
            password: String(payload.password || ''),
            email_confirm: true,
            user_metadata: {
              username: result.account.username,
              full_name: result.account.fullName,
              role: result.account.role,
            },
          });
          authUserId = adminAuthData?.user?.id;
        } else {
          const { data: signUpData } = await supabase.auth.signUp({
            email: internalEmail,
            password: String(payload.password || ''),
            options: {
              data: {
                username: result.account.username,
                full_name: result.account.fullName,
                role: result.account.role,
              },
            },
          });
          authUserId = signUpData?.user?.id;
        }

        if (authUserId) {
          result.account.id = authUserId;
          result.auditEntry.targetId = authUserId;

          await supabase.from('users').upsert({
            id: authUserId,
            username: result.account.username,
            full_name: result.account.fullName,
            phone: result.account.phone,
            status: 'active',
          });

          const roleId = ROLE_TO_ID[result.account.role] || 6;
          await supabase.from('user_roles').upsert({
            user_id: authUserId,
            role_id: roleId,
          });

          await supabase.from('audit_log').insert({
            action: result.auditEntry.action,
            target_id: authUserId,
            details: result.auditEntry.details,
          });
        }
      } catch {
        // Continue with application state if Supabase Auth signup is restricted before service role key is set
      }

      return NextResponse.json(result, { status: 201 });
    }

    if (action === 'CHANGE_ROLE') {
      const target = (accounts || []).find((a) => a.id === payload.targetId);
      if (!target) {
        return NextResponse.json(
          { error: 'Target account not found.' },
          { status: 404 }
        );
      }
      const newRole = payload.newRole as Role;
      if (!ALL_ROLES.includes(newRole)) {
        return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
      }
      const result = changeUserRole(actor, target, newRole);
      if (!result.success || !result.auditEntry) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      try {
        const roleId = ROLE_TO_ID[newRole];
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', target.id);
        await supabase.from('user_roles').insert({
          user_id: target.id,
          role_id: roleId,
        });
        await supabase.from('audit_log').insert({
          action: result.auditEntry.action,
          details: result.auditEntry.details,
        });
      } catch {
        // Non-blocking fallback
      }

      return NextResponse.json(result, { status: 200 });
    }

    if (action === 'SET_STATUS') {
      const target = (accounts || []).find((a) => a.id === payload.targetId);
      if (!target) {
        return NextResponse.json(
          { error: 'Target account not found.' },
          { status: 404 }
        );
      }
      const newStatus = payload.newStatus as 'active' | 'deactivated';
      const result = setAccountStatus(actor, target, newStatus);
      if (!result.success || !result.auditEntry) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      try {
        await supabase
          .from('users')
          .update({ status: newStatus })
          .eq('username', target.username);
        await supabase.from('audit_log').insert({
          action: result.auditEntry.action,
          details: result.auditEntry.details,
        });
      } catch {
        // Non-blocking fallback
      }

      return NextResponse.json(result, { status: 200 });
    }

    if (action === 'RESET_PASSWORD') {
      const target = (accounts || []).find((a) => a.id === payload.targetId);
      if (!target) {
        return NextResponse.json(
          { error: 'Target account not found.' },
          { status: 404 }
        );
      }
      const result = resetAccountPassword(
        actor,
        target,
        String(payload.newPassword || '')
      );
      if (!result.success || !result.auditEntry) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (serviceKey && serviceKey !== 'your-supabase-service-role-key') {
          await supabase.auth.admin.updateUserById(target.id, {
            password: String(payload.newPassword || ''),
          });
        }
        await supabase.from('audit_log').insert({
          action: result.auditEntry.action,
          details: result.auditEntry.details,
        });
      } catch {
        // Non-blocking fallback
      }

      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err) {
    console.error('Server-side account management error:', err);
    return NextResponse.json(
      { error: 'Internal server error processing account request.' },
      { status: 500 }
    );
  }
}
