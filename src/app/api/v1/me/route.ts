import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';
import { creditEngine } from '@/lib/credits/creditEngine';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  await connectToDatabase();

  const user = (await persistenceBridge.getUserById(session.userId)) || memoryStore.users.get(session.userId);
  const workspace = (await persistenceBridge.getWorkspaceById(session.workspaceId)) || memoryStore.workspaces.get(session.workspaceId);
  const brandProfile = (await persistenceBridge.getBrandProfile(session.workspaceId)) || memoryStore.brandProfiles.get(session.workspaceId);
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

export async function PATCH(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const body = await req.json().catch(() => ({}));
    let user = memoryStore.users.get(session.userId);

    if (!user) {
      user = {
        id: session.userId,
        email: session.email,
        name: session.name,
        authProvider: 'google',
        createdAt: new Date(),
      };
      memoryStore.users.set(user.id, user);
    }

    if (body.name && typeof body.name === 'string' && body.name.trim()) {
      user.name = body.name.trim();
    }
    if (body.avatar && typeof body.avatar === 'string') {
      user.avatar = body.avatar.trim();
    }

    memoryStore.users.set(user.id, user);

    await persistenceBridge.persistUser(user);

    return NextResponse.json({
      success: true,
      user,
      message: 'Profile updated successfully',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
