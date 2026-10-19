import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) {
    return unauthorizedResponse('Authentication required. Please login to access PostPilot.');
  }

  await connectToDatabase();

  const user = (await persistenceBridge.getUserById(session.userId)) || memoryStore.users.get(session.userId);
  const workspace = (await persistenceBridge.getWorkspaceById(session.workspaceId)) || memoryStore.workspaces.get(session.workspaceId);
  const brandProfile = (await persistenceBridge.getBrandProfile(session.workspaceId)) || memoryStore.brandProfiles.get(session.workspaceId);

  return NextResponse.json({
    success: true,
    user,
    workspace,
    brandProfile,
    role: session.role,
    session,
  });
}
