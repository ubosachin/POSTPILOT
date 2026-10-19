import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'http://localhost:3000').replace(/\/$/, '');
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // If Google OAuth credentials are not configured yet, redirect back with helpful diagnostic error
  if (!clientId || clientId.trim() === '') {
    const errorUrl = new URL('/login', baseUrl);
    errorUrl.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(errorUrl);
  }

  // Generate cryptographically secure state parameter for CSRF mitigation
  const state = crypto.randomBytes(24).toString('hex');

  // Google OAuth 2.0 Endpoint
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId.trim());
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(googleAuthUrl);

  // Store state parameter in secure HTTP-only cookie valid for 10 minutes
  response.cookies.set('pp_google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return response;
}
