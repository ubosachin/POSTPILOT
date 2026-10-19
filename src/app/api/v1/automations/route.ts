import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { automationEngine } from '@/lib/automations/automationEngine';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  const automations = memoryStore.getContentAutomations(session.workspaceId);
  return NextResponse.json({
    success: true,
    automations,
  });
}

export async function POST(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canManageAutomations')) {
    return forbiddenResponse('Forbidden: Your role does not have permission to create or manage automations.');
  }

  try {
    const body = await req.json();
    const automation = await automationEngine.saveAutomation(session.workspaceId, body);
    return NextResponse.json({
      success: true,
      automation,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
