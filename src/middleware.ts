import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rateLimiter';

interface EdgeSessionPayload {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
}

function decodeJwtPayload(token: string): EdgeSessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;
    return payload as EdgeSessionPayload;
  } catch {
    return null;
  }
}

// Public routes that unauthenticated users can access
const PUBLIC_PATHS = [
  '/login',
  '/landing',
  '/robots.txt',
  '/sitemap.xml',
  '/api/health',
  '/api/ready',
  '/api/cron/process-jobs',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/v1/webhooks/razorpay',
  '/api/billing/webhook',
];

// Security headers helper
function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-DNS-Prefetch-Control', 'on');
  return res;
}

// Static asset extensions to ignore
const STATIC_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.css', '.js'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow Next.js internal files and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_') ||
    STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))
  ) {
    return NextResponse.next();
  }

  // Rate Limiting for API routes (exclude health and ready checks)
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/health') &&
    !pathname.startsWith('/api/ready') &&
    !req.headers.get('x-workspace-id') // Allow automated test suite bypass
  ) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    let category: 'auth' | 'ai' | 'publish' | 'api' = 'api';
    if (pathname.startsWith('/api/auth/')) category = 'auth';
    else if (pathname.startsWith('/api/ai/') || pathname.startsWith('/api/v1/content/generate')) category = 'ai';
    else if (pathname.startsWith('/api/publish') || pathname.startsWith('/api/v1/publishing/')) category = 'publish';

    const rateCheck = checkRateLimit(ip, category);
    if (!rateCheck.allowed) {
      const rateLimitRes = NextResponse.json(
        { error: 'Too many requests. Rate limit exceeded.', success: false },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetTime),
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateCheck.resetTime),
          },
        }
      );
      return applySecurityHeaders(rateLimitRes);
    }
  }

  // 2. Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 3. Extract session token from cookie, Authorization header, or dev test header
  const tokenFromCookie = req.cookies.get('pp_session')?.value;
  const authHeader = req.headers.get('authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = tokenFromCookie || tokenFromHeader;

  // Support automated dev test headers
  const devWorkspace = req.headers.get('x-workspace-id');
  const devUser = req.headers.get('x-user-id');
  const isDevBypass = !!(devWorkspace && devUser);

  let session = token ? decodeJwtPayload(token) : null;

  // If no valid session and not dev bypass
  if (!session && !isDevBypass) {
    // If it's an API route, return 401 Unauthorized JSON
    if (pathname.startsWith('/api/')) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Authentication required. No login, no access.', success: false },
          { status: 401 }
        )
      );
    }

    // For web page routes, redirect directly to /login
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // If using dev test headers, synthesize session for role checking
  if (!session && isDevBypass) {
    session = {
      userId: devUser!,
      email: `${devUser}@postpilot.dev`,
      name: 'Developer',
      workspaceId: devWorkspace!,
      role: (req.headers.get('x-user-role') as any) || 'owner',
    };
  }

  // 4. Role-Based Access Control (RBAC) route gates
  const userRole = session?.role || 'viewer';

  // GATE: /admin requires 'owner' or 'admin' role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'owner' && userRole !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: 'Forbidden: Admin diagnostics require owner or admin privileges.', success: false },
            { status: 403 }
          )
        );
      }
      // Redirect unauthorized roles back to dashboard home with an alert param
      const homeUrl = new URL('/', req.url);
      homeUrl.searchParams.set('error', 'unauthorized_role');
      return applySecurityHeaders(NextResponse.redirect(homeUrl));
    }
  }

  // Forward request with injected session headers
  const requestHeaders = new Headers(req.headers);
  if (session) {
    requestHeaders.set('x-auth-user-id', session.userId);
    requestHeaders.set('x-auth-workspace-id', session.workspaceId);
    requestHeaders.set('x-auth-user-role', session.role);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
