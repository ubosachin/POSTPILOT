import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, forbiddenResponse, hasPermission } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session.role, 'canManageSocialAccounts')) {
    return forbiddenResponse('Only workspace owners and admins can disconnect social accounts.');
  }

  await connectToDatabase();

  const { id } = await params;
  const account = memoryStore.socialAccounts.get(id);

  if (!account || account.workspaceId !== session.workspaceId) {
    return NextResponse.json({ success: false, error: 'Social account not found' }, { status: 404 });
  }

  memoryStore.socialAccounts.delete(id);
  await persistenceBridge.deleteSocialAccount(id, session.workspaceId);

  memoryStore.addAuditLog({
    workspaceId: session.workspaceId,
    actorId: session.userId,
    actorName: session.name,
    action: 'SOCIAL_ACCOUNT_DISCONNECTED',
    resourceId: id,
    resourceType: 'socialAccount',
    details: { platform: account.platform, accountId: account.accountId },
  });

  return NextResponse.json({ success: true, message: 'Account disconnected successfully' });
}
