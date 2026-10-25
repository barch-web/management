import { NextRequest, NextResponse } from 'next/server';
import { canManageAccounts, Role } from '@/lib/rbac';
import {
  provisionUserAccount,
  changeUserRole,
  setAccountStatus,
  resetAccountPassword,
  type UserAccount,
} from '@/lib/auth-logic';

/**
 * Server-side Account Provisioning & RBAC Enforcement Endpoint
 * Validates that only Director or Operation Manager roles can create accounts,
 * change roles, deactivate/reactivate accounts, or reset another user's password.
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

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
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
      const result = changeUserRole(actor, target, payload.newRole as Role);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
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
      const result = setAccountStatus(
        actor,
        target,
        payload.newStatus as 'active' | 'deactivated'
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
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
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
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
