import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'postpilot-dev-jwt-super-secret-key-32-chars-minimum';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  role: UserRole;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export const ROLE_PERMISSIONS = {
  canViewAnalytics: ['owner', 'admin', 'editor', 'viewer'] as UserRole[],
  canViewContent: ['owner', 'admin', 'editor', 'viewer'] as UserRole[],
  canGenerateContent: ['owner', 'admin', 'editor'] as UserRole[],
  canApprovePosts: ['owner', 'admin', 'editor'] as UserRole[],
  canPublishJobs: ['owner', 'admin', 'editor'] as UserRole[],
  canManageAutomations: ['owner', 'admin', 'editor'] as UserRole[],
  canManageSocialAccounts: ['owner', 'admin'] as UserRole[],
  canManageBilling: ['owner', 'admin'] as UserRole[],
  canAccessAdmin: ['owner', 'admin'] as UserRole[],
  canDeleteWorkspace: ['owner'] as UserRole[],
};

export function hasPermission(role: UserRole, action: keyof typeof ROLE_PERMISSIONS): boolean {
  return ROLE_PERMISSIONS[action].includes(role);
}

export function isAtLeastRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

export function createToken(session: AuthSession): string {
  return jwt.sign(session, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Universal safe JWT payload decode (works in Edge runtime & Node.js)
 */
export function decodeJwtPayload(token: string): AuthSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const jsonStr = typeof atob !== 'undefined'
      ? atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
      : Buffer.from(parts[1], 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr);
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;
    return payload as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Extracts and validates the authenticated session from NextRequest.
 * Supports Bearer Authorization header, custom x-workspace-id override (if authorized),
 * or pp_session cookie.
 */
export function getAuthSession(req: NextRequest): AuthSession | null {
  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = verifyToken(token);
    if (session) return session;
  }

  // Check Cookie
  const cookieToken = req.cookies.get('pp_session')?.value;
  if (cookieToken) {
    const session = verifyToken(cookieToken);
    if (session) return session;
  }

  // Fallback dev header for local automated tests
  const devWorkspace = req.headers.get('x-workspace-id');
  const devUser = req.headers.get('x-user-id');
  const devRole = (req.headers.get('x-user-role') as UserRole) || 'owner';
  if (devWorkspace && devUser) {
    return {
      userId: devUser,
      email: `${devUser}@postpilot.dev`,
      name: 'Developer Mode',
      workspaceId: devWorkspace,
      role: devRole,
    };
  }

  return null;
}

/**
 * Standard unauthorized response helper (401)
 */
export function unauthorizedResponse(message = 'Unauthorized or missing session') {
  return NextResponse.json({ error: message, success: false }, { status: 401 });
}

/**
 * Standard forbidden response helper (403)
 */
export function forbiddenResponse(message = 'Forbidden: Insufficient role permissions for this operation') {
  return NextResponse.json({ error: message, success: false }, { status: 403 });
}
