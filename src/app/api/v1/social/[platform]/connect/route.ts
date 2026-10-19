import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, forbiddenResponse, hasPermission } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { encryptCredentials } from '@/lib/crypto';
import { Platform, SocialAccount } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session.role, 'canManageSocialAccounts')) {
    return forbiddenResponse('Only workspace owners and admins can connect social accounts.');
  }

  const { platform } = await params;
  if (platform !== 'bluesky' && platform !== 'x') {
    return NextResponse.json({ success: false, error: 'Platform must be bluesky or x' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { accountId, displayName, credentials } = body;

    if (!accountId || !credentials) {
      return NextResponse.json({ success: false, error: 'accountId and credentials are required' }, { status: 400 });
    }

    const encrypted = encryptCredentials(credentials);
    const accountIdClean = accountId.replace(/^@/, '');

    const existing = Array.from(memoryStore.socialAccounts.values()).find(
      (a) => a.workspaceId === session.workspaceId && a.platform === platform && a.accountId === accountIdClean
    );

    let account: SocialAccount;
    if (existing) {
      existing.displayName = displayName || `${platform.toUpperCase()} (@${accountIdClean})`;
      existing.encryptedCredentials = encrypted;
      existing.status = 'active';
      existing.lastVerifiedAt = new Date();
      existing.errorMessage = undefined;
      account = existing;
    } else {
      account = {
        id: `soc_${Date.now()}_${platform}`,
        workspaceId: session.workspaceId,
        platform: platform as Platform,
        accountId: accountIdClean,
        displayName: displayName || `${platform === 'bluesky' ? 'Bluesky' : 'X'} (@${accountIdClean})`,
        encryptedCredentials: encrypted,
        status: 'active',
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
      };
      memoryStore.socialAccounts.set(account.id, account);
    }

    memoryStore.addAuditLog({
      workspaceId: session.workspaceId,
      actorId: session.userId,
      actorName: session.name,
      action: 'SOCIAL_ACCOUNT_CONNECTED',
      resourceId: account.id,
      resourceType: 'socialAccount',
      details: { platform, accountId: accountIdClean },
    });

    // Strip sensitive encrypted credentials before returning
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
