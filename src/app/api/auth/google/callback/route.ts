import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { persistenceBridge } from '@/lib/db/persistence';
import { creditEngine } from '@/lib/credits/creditEngine';
import { UserRole } from '@/types';

export async function GET(req: NextRequest) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'http://localhost:3000').replace(/\/$/, '');
  const searchParams = req.nextUrl.searchParams;

  const errorParam = searchParams.get('error');
  if (errorParam) {
    console.error(`[Google OAuth Callback] Error returned from Google: ${errorParam}`);
    const errorRedirect = new URL('/login', baseUrl);
    errorRedirect.searchParams.set('error', `google_${errorParam}`);
    return NextResponse.redirect(errorRedirect);
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const savedState = req.cookies.get('pp_google_oauth_state')?.value;

  // CSRF validation
  if (!state || !savedState || state !== savedState) {
    console.error('[Google OAuth Callback] State mismatch or expired state cookie (CSRF detected)');
    const errorRedirect = new URL('/login', baseUrl);
    errorRedirect.searchParams.set('error', 'invalid_state');
    return NextResponse.redirect(errorRedirect);
  }

  if (!code) {
    const errorRedirect = new URL('/login', baseUrl);
    errorRedirect.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(errorRedirect);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[Google OAuth Callback] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
    const errorRedirect = new URL('/login', baseUrl);
    errorRedirect.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(errorRedirect);
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Google OAuth Callback] Token exchange failed:', tokenData);
      const errorRedirect = new URL('/login', baseUrl);
      errorRedirect.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(errorRedirect);
    }

    // 2. Fetch authenticated and verified profile from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      console.error('[Google OAuth Callback] Failed to fetch user profile:', profile);
      const errorRedirect = new URL('/login', baseUrl);
      errorRedirect.searchParams.set('error', 'profile_fetch_failed');
      return NextResponse.redirect(errorRedirect);
    }

    // 3. Strict validation: Email must be verified by Google
    if (!profile.email_verified) {
      console.error('[Google OAuth Callback] Google email is not verified:', profile.email);
      const errorRedirect = new URL('/login', baseUrl);
      errorRedirect.searchParams.set('error', 'email_not_verified');
      return NextResponse.redirect(errorRedirect);
    }

    const email = profile.email.trim().toLowerCase();
    const name = profile.name || email.split('@')[0];
    const avatar = profile.picture || undefined;

    // Ensure database connection
    try {
      const { connectToDatabase } = await import('@/lib/db');
      await connectToDatabase();
    } catch {
      // fallback
    }

    // 4. Find or create user
    let isNewUser = false;
    let user = Array.from(memoryStore.users.values()).find((u) => u.email.toLowerCase() === email);
    let workspaceId = 'ws_postpilot_main';
    let role: UserRole = 'owner';

    if (!user) {
      isNewUser = true;
      user = {
        id: `usr_${Date.now()}`,
        email,
        name,
        authProvider: 'google',
        avatar,
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
        timezone: 'UTC',
        createdAt: new Date(),
      };
      memoryStore.workspaces.set(ws.id, ws);
      persistenceBridge.persistWorkspace(ws).catch(() => {});
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

      // Grant exactly-once 50 free credits allowance
      await creditEngine.grantSignupCredits(ws.id, user.id);
    } else {
      // Existing user: link workspace and role
      const currentUserId = user.id;
      const membership = Array.from(memoryStore.memberships.values()).find((m) => m.userId === currentUserId);
      if (membership) {
        workspaceId = membership.workspaceId;
        role = membership.role;
      }
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
    }

    // 5. Create secure JWT session token
    const token = createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      workspaceId,
      role,
    });

    // 6. Redirect to dashboard or onboarding
    const targetUrl = new URL(isNewUser ? '/?onboarding=true' : '/', baseUrl);
    const response = NextResponse.redirect(targetUrl);

    // 7. Set secure session cookie
    response.cookies.set('pp_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // 8. Clean up temporary OAuth state cookie
    response.cookies.delete('pp_google_oauth_state');

    return response;
  } catch (err) {
    console.error('[Google OAuth Callback] Unexpected exception:', err);
    const errorRedirect = new URL('/login', baseUrl);
    errorRedirect.searchParams.set('error', 'server_error');
    return NextResponse.redirect(errorRedirect);
  }
}
