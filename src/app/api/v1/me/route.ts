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

export async function PATCH(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  try {
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

    // Dynamic import to avoid circular dependency
    const { persistenceBridge } = await import('@/lib/db/persistence');
    persistenceBridge.persistUser(user).catch(() => {});

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
