import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'http://localhost:3000').replace(/\/$/, '');

  const session = getAuthSession(req);
  if (!session) {
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  const clientId = process.env.X_CLIENT_ID;
  if (!clientId || clientId.trim() === '') {
    const redirect = new URL('/social-accounts', baseUrl);
    redirect.searchParams.set('error', 'x_client_id_missing');
    return NextResponse.redirect(redirect);
  }

  // Generate PKCE code verifier and code challenge
  // RFC 7636: high-entropy cryptographic random string using [A-Z, a-z, 0-9, -, ., _, ~]
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = `${baseUrl}/api/auth/x/callback`;

  // Twitter API v2 OAuth 2.0 Authorize endpoint
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId.trim());
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl);

  // Store state and code_verifier in secure HTTP-only cookies
  response.cookies.set('pp_x_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  response.cookies.set('pp_x_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}
