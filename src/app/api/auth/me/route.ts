import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) {
    return unauthorizedResponse('Authentication required. Please login to access PostPilot.');
  }

  await connectToDatabase();

  const user = memoryStore.users.get(session.userId);
  const workspace = memoryStore.workspaces.get(session.workspaceId);
  const brandProfile = memoryStore.brandProfiles.get(session.workspaceId);

  return NextResponse.json({
    success: true,
    user,
    workspace,
    brandProfile,
    role: session.role,
    session,
  });
}
