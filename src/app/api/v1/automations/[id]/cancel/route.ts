import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { automationEngine } from '@/lib/automations/automationEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canManageAutomations')) {
    return forbiddenResponse('Forbidden: Your role does not have permission to cancel automations.');
  }

  await connectToDatabase();

  const { id } = await params;
  try {
    const updated = await automationEngine.cancelAutomation(session.workspaceId, id);
    return NextResponse.json({ success: true, automation: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
