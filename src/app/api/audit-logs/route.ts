import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canAccessAdmin')) {
    return forbiddenResponse('Forbidden: Audit logs and diagnostics require owner or admin privileges.');
  }

  await connectToDatabase();

  const workspaceId = session.workspaceId;
  const logs = await persistenceBridge.getAuditLogs(workspaceId);

  return NextResponse.json({
    success: true,
    logs,
  });
}
