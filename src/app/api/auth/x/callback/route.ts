import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';
import { encryptCredentials } from '@/lib/crypto';
import { SocialAccount } from '@/types';

export async function GET(req: NextRequest) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'http://localhost:3000').replace(/\/$/, '');
  const searchParams = req.nextUrl.searchParams;

  const errorParam = searchParams.get('error');
  if (errorParam) {
    console.error(`[X OAuth Callback] Error from X: ${errorParam}`);
    const errorRedirect = new URL('/social-accounts', baseUrl);
    errorRedirect.searchParams.set('error', `x_${errorParam}`);
    return NextResponse.redirect(errorRedirect);
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const savedState = req.cookies.get('pp_x_oauth_state')?.value;
  const codeVerifier = req.cookies.get('pp_x_code_verifier')?.value;

  // CSRF validation
  if (!state || !savedState || state !== savedState) {
    console.error('[X OAuth Callback] State mismatch or expired state cookie');
    const errorRedirect = new URL('/social-accounts', baseUrl);
    errorRedirect.searchParams.set('error', 'invalid_state');
    return NextResponse.redirect(errorRedirect);
  }

  if (!code || !codeVerifier) {
    const errorRedirect = new URL('/social-accounts', baseUrl);
    errorRedirect.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(errorRedirect);
  }

  const session = getAuthSession(req);
  if (!session) {
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('error', 'session_expired');
    return NextResponse.redirect(loginUrl);
  }

  const clientId = process.env.X_CLIENT_ID || process.env.X_API_KEY;
  const clientSecret = process.env.X_CLIENT_SECRET || process.env.X_API_SECRET;

  if (!clientId || clientId.trim() === '') {
    const errorRedirect = new URL('/social-accounts', baseUrl);
    errorRedirect.searchParams.set('error', 'x_not_configured');
    return NextResponse.redirect(errorRedirect);
  }

  const redirectUri = `${baseUrl}/api/auth/x/callback`;

  try {
    // 1. Exchange authorization code for user-level OAuth 2.0 access & refresh tokens
    const bodyParams = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: clientId.trim(),
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (clientSecret && clientSecret.trim()) {
      const basicAuth = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: bodyParams,
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[X OAuth Callback] Token exchange failed:', tokenData);
      const errorRedirect = new URL('/social-accounts', baseUrl);
      const errMsg = tokenData.error_description || tokenData.error || 'token_exchange_failed';
      errorRedirect.searchParams.set('error', errMsg);
      return NextResponse.redirect(errorRedirect);
    }

    // 2. Fetch authenticated user profile from Twitter API v2
    const profileRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileRes.json();
    const twitterUser = profileData?.data;
    const accountHandle = (twitterUser?.username || 'user').replace(/^@/, '');
    const displayName = twitterUser?.name ? `${twitterUser.name} (@${accountHandle})` : `X (@${accountHandle})`;

    // 3. Encrypt user-specific OAuth credentials
    const credentials = {
      oauth2Token: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in || 7200) * 1000,
      tokenType: 'bearer',
      twitterUserId: twitterUser?.id,
      scope: tokenData.scope,
    };

    const encryptedCredentials = encryptCredentials(credentials);

    await connectToDatabase();
    const workspaceId = session.workspaceId;

    // 4. Upsert social account in memory and DB
    const existingAccounts = await persistenceBridge.getSocialAccounts(workspaceId);
    const existing = existingAccounts.find(
      (a) => a.workspaceId === workspaceId && a.platform === 'x' && a.accountId.toLowerCase() === accountHandle.toLowerCase()
    );

    let account: SocialAccount;
    if (existing) {
      existing.displayName = displayName;
      existing.encryptedCredentials = encryptedCredentials;
      existing.status = 'active';
      existing.lastVerifiedAt = new Date();
      existing.errorMessage = undefined;
      account = existing;
    } else {
      account = {
        id: `soc_${Date.now()}_x`,
        workspaceId,
        platform: 'x',
        accountId: accountHandle,
        displayName,
        encryptedCredentials,
        status: 'active',
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
      };
      memoryStore.socialAccounts.set(account.id, account);
    }

    await persistenceBridge.persistSocialAccount(account);

    memoryStore.addAuditLog({
      workspaceId,
      actorId: session.userId,
      actorName: session.name,
      action: 'SOCIAL_ACCOUNT_CONNECTED',
      resourceId: account.id,
      resourceType: 'socialAccount',
      details: { platform: 'x', accountId: accountHandle, method: 'oauth2' },
    });

    // 5. Clean up cookies and redirect back to social accounts page with success notification
    const successRedirect = new URL('/social-accounts', baseUrl);
    successRedirect.searchParams.set('success', 'x_connected');
    successRedirect.searchParams.set('handle', accountHandle);

    const response = NextResponse.redirect(successRedirect);
    response.cookies.delete('pp_x_oauth_state');
    response.cookies.delete('pp_x_code_verifier');

    return response;
  } catch (err) {
    console.error('[X OAuth Callback] Exception:', err);
    const errorRedirect = new URL('/social-accounts', baseUrl);
    errorRedirect.searchParams.set('error', 'internal_oauth_error');
    return NextResponse.redirect(errorRedirect);
  }
}
