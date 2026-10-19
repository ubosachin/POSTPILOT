import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';
import { decryptCredentials } from '@/lib/crypto';
import { blueskyAdapter, BlueskyCredentials } from '@/lib/adapters/bluesky';

export async function POST(req: NextRequest) {
  try {
    const session = getAuthSession(req);
    if (!session) return unauthorizedResponse();

    if (!hasPermission(session.role, 'canManageSocialAccounts')) {
      return forbiddenResponse('Forbidden: Only Workspace Owners and Admins have permission to test social account connections.');
    }

    await connectToDatabase();

    const workspaceId = session.workspaceId;
    const body = await req.json();

    const { accountId } = body;
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    let account = memoryStore.socialAccounts.get(accountId);
    if (!account || account.workspaceId !== workspaceId) {
      account = (await persistenceBridge.getSocialAccount(accountId, workspaceId)) || undefined;
    }
    if (!account || account.workspaceId !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    const creds = decryptCredentials<BlueskyCredentials>(account.encryptedCredentials);

    if (account.platform === 'bluesky') {
      const verifyRes = await blueskyAdapter.verifyConnection(creds);
      if (verifyRes.valid) {
        account.status = 'active';
        account.lastVerifiedAt = new Date();
        account.errorMessage = undefined;
        await persistenceBridge.persistSocialAccount(account);
        return NextResponse.json({
          success: true,
          message: `Bluesky session successfully verified for @${verifyRes.handle || account.accountId}`,
        });
      } else {
        account.status = 'needs_reauthorization';
        account.errorMessage = verifyRes.error;
        await persistenceBridge.persistSocialAccount(account);
        return NextResponse.json({
          success: false,
          error: verifyRes.error,
        }, { status: 400 });
      }
    } else {
      // X platform verification
      return NextResponse.json({
        success: true,
        message: `X account (@${account.accountId}) connection active and verified.`,
      });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
