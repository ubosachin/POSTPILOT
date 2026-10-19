import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';
import { automationEngine } from '@/lib/automations/automationEngine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  await connectToDatabase();

  const { id } = await params;
  const automation = memoryStore.contentAutomations.get(id);

  if (!automation || automation.workspaceId !== session.workspaceId) {
    return NextResponse.json({ success: false, error: 'Automation not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, automation });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canManageAutomations')) {
    return forbiddenResponse('Forbidden: Your role does not have permission to update automations.');
  }

  await connectToDatabase();

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await automationEngine.saveAutomation(session.workspaceId, { ...body, id });
    return NextResponse.json({ success: true, automation: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canManageAutomations')) {
    return forbiddenResponse('Forbidden: Your role does not have permission to delete automations.');
  }

  await connectToDatabase();

  const { id } = await params;
  const automation = memoryStore.contentAutomations.get(id);

  if (!automation || automation.workspaceId !== session.workspaceId) {
    return NextResponse.json({ success: false, error: 'Automation not found' }, { status: 404 });
  }

  memoryStore.contentAutomations.delete(id);
  await persistenceBridge.deleteContentAutomation(id, session.workspaceId);
  return NextResponse.json({ success: true, message: 'Automation deleted' });
}
