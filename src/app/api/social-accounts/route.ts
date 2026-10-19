import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { encryptCredentials } from '@/lib/crypto';
import { SocialAccount } from '@/types';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  const workspaceId = session.workspaceId;

  const accounts = memoryStore.getSocialAccounts(workspaceId).map((acc) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedCredentials, ...safe } = acc;
    return {
      ...safe,
      hasCredentials: Boolean(encryptedCredentials),
    };
  });

  return NextResponse.json({
    success: true,
    accounts,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = getAuthSession(req);
    if (!session) return unauthorizedResponse();

    if (!hasPermission(session.role, 'canManageSocialAccounts')) {
      return forbiddenResponse('Forbidden: Only Workspace Owners and Admins have permission to connect or manage social accounts.');
    }

    const workspaceId = session.workspaceId;
    const body = await req.json();

    const { platform, accountId, displayName, credentials } = body;

    if (!platform || !accountId || !credentials) {
      return NextResponse.json({ success: false, error: 'Platform, accountId and credentials are required' }, { status: 400 });
    }

    if (platform !== 'bluesky' && platform !== 'x') {
      return NextResponse.json({ success: false, error: 'Platform must be either bluesky or x' }, { status: 400 });
    }

    // Check unique constraint per workspace
    const existing = Array.from(memoryStore.socialAccounts.values()).find(
      (a) => a.workspaceId === workspaceId && a.platform === platform && a.accountId === accountId
    );

    const encrypted = encryptCredentials(credentials);
    const accountId_clean = accountId.replace(/^@/, '');

    let account: SocialAccount;
    if (existing) {
      existing.displayName = displayName || `${platform.toUpperCase()} (${accountId_clean})`;
      existing.encryptedCredentials = encrypted;
      existing.status = 'active';
      existing.lastVerifiedAt = new Date();
      existing.errorMessage = undefined;
      account = existing;
    } else {
      account = {
        id: `soc_${Date.now()}_${platform}`,
        workspaceId,
        platform,
        accountId: accountId_clean,
        displayName: displayName || `${platform === 'bluesky' ? 'Bluesky' : 'X'} (@${accountId_clean})`,
        encryptedCredentials: encrypted,
        status: 'active',
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
      };
      memoryStore.socialAccounts.set(account.id, account);
    }

    memoryStore.addAuditLog({
      workspaceId,
      actorId: session?.userId || 'usr_pilot_01',
      actorName: session?.name || 'Alex Rivera',
      action: 'SOCIAL_ACCOUNT_CONNECTED',
      resourceId: account.id,
      resourceType: 'socialAccount',
      details: { platform, accountId: accountId_clean },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedCredentials, ...safeAccount } = account;
    return NextResponse.json({
      success: true,
      account: safeAccount,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = getAuthSession(req);
  const workspaceId = session ? session.workspaceId : 'ws_postpilot_main';
  const url = new URL(req.url);
  const accountId = url.searchParams.get('id');

  if (!accountId) {
    return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 });
  }

  const account = memoryStore.socialAccounts.get(accountId);
  if (!account || account.workspaceId !== workspaceId) {
    return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
  }

  memoryStore.socialAccounts.delete(accountId);

  memoryStore.addAuditLog({
    workspaceId,
    actorId: session?.userId || 'usr_pilot_01',
    actorName: session?.name || 'Alex Rivera',
    action: 'SOCIAL_ACCOUNT_DISCONNECTED',
    resourceId: accountId,
    resourceType: 'socialAccount',
    details: { platform: account.platform, accountId: account.accountId },
  });

  return NextResponse.json({ success: true, message: 'Account disconnected successfully' });
}
