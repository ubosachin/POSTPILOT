import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { creditEngine } from '@/lib/credits/creditEngine';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  const user = memoryStore.users.get(session.userId);
  const workspace = memoryStore.workspaces.get(session.workspaceId);
  const brandProfile = memoryStore.brandProfiles.get(session.workspaceId);
  const wallet = await creditEngine.getWallet(session.workspaceId);

  return NextResponse.json({
    success: true,
    user: user || { id: session.userId, email: session.email, name: session.name },
    workspace: workspace || { id: session.workspaceId, name: 'Workspace', planId: 'starter' },
    brandProfile,
    role: session.role,
    wallet,
  });
}
