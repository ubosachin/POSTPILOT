import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canAccessAdmin')) {
    return forbiddenResponse('Forbidden: Audit logs and diagnostics require owner or admin privileges.');
  }

  const workspaceId = session.workspaceId;

  const logs = memoryStore.getAuditLogs(workspaceId);

  return NextResponse.json({
    success: true,
    logs,
  });
}
