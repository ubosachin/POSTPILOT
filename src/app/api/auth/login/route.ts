import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { UserRole } from '@/types';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';
import { creditEngine } from '@/lib/credits/creditEngine';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const name = body.name || email.split('@')[0];
    const authProvider = body.authProvider || 'local';

    let isNewUser = false;
    let user = await persistenceBridge.getUserByEmail(email);
    let workspaceId = 'ws_postpilot_main';
    let role: UserRole = 'owner';

    if (!user) {
      isNewUser = true;
      user = {
        id: `usr_${Date.now()}`,
        email,
        name,
        authProvider: authProvider as 'google' | 'local',
        createdAt: new Date(),
      };
      memoryStore.users.set(user.id, user);
      await persistenceBridge.persistUser(user);

      // Create initial workspace for new user
      const ws = {
        id: `ws_${Date.now()}`,
        name: `${user.name}'s Growth Lab`,
        ownerId: user.id,
        planId: 'starter' as const,
        timezone: body.timezone || 'UTC',
        createdAt: new Date(),
      };
      memoryStore.workspaces.set(ws.id, ws);
      await persistenceBridge.persistWorkspace(ws);
      workspaceId = ws.id;

      // Create owner membership
      const mem = {
        id: `mem_${Date.now()}`,
        workspaceId: ws.id,
        userId: user.id,
        role: 'owner' as UserRole,
        createdAt: new Date(),
      };
      memoryStore.memberships.set(mem.id, mem);
      await persistenceBridge.persistMembership(mem);

      // Initialize default brand profile
      const bp = {
        id: `bp_${ws.id}`,
        workspaceId: ws.id,
        voice: 'Insightful & Pragmatic Builder',
        audience: 'Founders, Creators, Solo Engineers',
        topics: ['AI Automation', 'Micro-SaaS Growth', 'Social Publishing'],
        rules: ['Engage directly', 'Hook in first line', 'Clear actionable insight'],
        updatedAt: new Date(),
      };
      memoryStore.brandProfiles.set(ws.id, bp);
      await persistenceBridge.persistBrandProfile(bp);

      // Grant exactly-once free credit allowance
      await creditEngine.grantSignupCredits(ws.id, user.id);
    } else {
      // Existing user: retrieve their workspace
      const currentUserId = user.id;
      const membership = await persistenceBridge.getMembershipByUser(currentUserId);
      if (membership) {
        workspaceId = membership.workspaceId;
        role = membership.role as UserRole;
      }
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      workspaceId,
      role,
    });

    const wallet = await creditEngine.getWallet(workspaceId);

    const response = NextResponse.json({
      success: true,
      token,
      user,
      workspaceId,
      role,
      isNewUser,
      credits: wallet.balance,
      message: isNewUser ? 'Welcome to PostPilot! 50 free AI credits have been added.' : 'Logged in successfully.',
    });

    response.cookies.set('pp_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    response.cookies.set('postpilot_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
