import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';
import { encryptCredentials } from '@/lib/crypto';
import { SocialAccount } from '@/types';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  await connectToDatabase();

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

    await connectToDatabase();

    const workspaceId = session.workspaceId;
    const body = await req.json();

    const { platform, accountId, displayName } = body;
    let credentials = body.credentials || {};

    if (!platform || !accountId) {
      return NextResponse.json({ success: false, error: 'Platform and accountId are required' }, { status: 400 });
    }

    if (platform !== 'bluesky' && platform !== 'x') {
      return NextResponse.json({ success: false, error: 'Platform must be either bluesky or x' }, { status: 400 });
    }

    // Auto-fill X credentials from server environment if not provided
    if (platform === 'x') {
      if (!credentials.apiKey && process.env.X_API_KEY) credentials.apiKey = process.env.X_API_KEY;
      if (!credentials.apiSecret && process.env.X_API_SECRET) credentials.apiSecret = process.env.X_API_SECRET;
      if (!credentials.accessToken && process.env.X_ACCESS_TOKEN) credentials.accessToken = process.env.X_ACCESS_TOKEN;
      if (!credentials.accessTokenSecret && process.env.X_ACCESS_TOKEN_SECRET) credentials.accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

      if (!credentials.apiKey) {
        return NextResponse.json({ success: false, error: 'X API Key and Secret are required' }, { status: 400 });
      }
    } else if (platform === 'bluesky') {
      if (!credentials.password) {
        return NextResponse.json({ success: false, error: 'Bluesky app password is required' }, { status: 400 });
      }
      if (!credentials.identifier) {
        credentials.identifier = accountId;
      }
      if (!credentials.service) {
        credentials.service = process.env.BLUESKY_SERVICE_URL || 'https://bsky.social';
      }
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

    // Persist to MongoDB Atlas
    await persistenceBridge.persistSocialAccount(account);

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

  await connectToDatabase();

  const account = memoryStore.socialAccounts.get(accountId);
  if (!account || account.workspaceId !== workspaceId) {
    return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
  }

  memoryStore.socialAccounts.delete(accountId);
  await persistenceBridge.deleteSocialAccount(accountId, workspaceId);

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
