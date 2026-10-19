import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { persistenceBridge } from '@/lib/db/persistence';
import { creditEngine } from '@/lib/credits/creditEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email || 'alex@postpilot.io';
    const email = rawEmail.trim().toLowerCase();
    const name = body.name || email.split('@')[0];
    const authProvider = body.authProvider || 'google';

    let isNewUser = false;
    let user = Array.from(memoryStore.users.values()).find((u) => u.email.toLowerCase() === email);
    let workspaceId = 'ws_postpilot_main';
    let role = 'owner';

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
      persistenceBridge.persistUser(user).catch(() => {});

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
      persistenceBridge.persistWorkspace(ws).catch(() => {});
      workspaceId = ws.id;

      // Create owner membership
      memoryStore.memberships.set(`mem_${Date.now()}`, {
        id: `mem_${Date.now()}`,
        workspaceId: ws.id,
        userId: user.id,
        role: 'owner',
        createdAt: new Date(),
      });

      // Initialize default brand profile
      memoryStore.brandProfiles.set(ws.id, {
        id: `bp_${ws.id}`,
        workspaceId: ws.id,
        voice: 'Insightful & Pragmatic Builder',
        audience: 'Founders, Creators, Solo Engineers',
        topics: ['AI Automation', 'Micro-SaaS Growth', 'Social Publishing'],
        rules: ['Engage directly', 'Hook in first line', 'Clear actionable insight'],
        updatedAt: new Date(),
      });

      // Grant exactly-once free credit allowance
      await creditEngine.grantSignupCredits(ws.id, user.id);
    } else {
      // Existing user: retrieve their workspace
      const currentUserId = user.id;
      const membership = Array.from(memoryStore.memberships.values()).find((m) => m.userId === currentUserId);
      if (membership) {
        workspaceId = membership.workspaceId;
        role = membership.role;
      }
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      workspaceId,
      role: role as any,
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
    });

    // Set cookie for browser sessions
    response.cookies.set('pp_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
