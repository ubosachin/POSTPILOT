import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  const workspaceId = session.workspaceId;

  const workspace = memoryStore.workspaces.get(workspaceId);
  const brandProfile = memoryStore.brandProfiles.get(workspaceId);
  const members = Array.from(memoryStore.memberships.values()).filter((m) => m.workspaceId === workspaceId);

  return NextResponse.json({
    success: true,
    workspace,
    brandProfile,
    members,
  });
}

export async function PATCH(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canAccessAdmin')) {
    return forbiddenResponse('Forbidden: Only Workspace Owners and Admins have permission to modify workspace and brand profile settings.');
  }

  const workspaceId = session.workspaceId;
  const body = await req.json();

  const workspace = memoryStore.workspaces.get(workspaceId);
  if (!workspace) {
    return NextResponse.json({ success: false, error: 'Workspace not found' }, { status: 404 });
  }

  if (body.name) workspace.name = body.name;
  if (body.timezone) workspace.timezone = body.timezone;

  // Update brand profile if provided
  if (body.brandProfile) {
    let bp = memoryStore.brandProfiles.get(workspaceId);
    if (!bp) {
      bp = {
        id: `bp_${Date.now()}`,
        workspaceId,
        voice: body.brandProfile.voice || 'Insightful & Direct',
        audience: body.brandProfile.audience || 'Tech Founders',
        topics: body.brandProfile.topics || [],
        rules: body.brandProfile.rules || [],
        updatedAt: new Date(),
      };
      memoryStore.brandProfiles.set(workspaceId, bp);
    } else {
      if (body.brandProfile.voice) bp.voice = body.brandProfile.voice;
      if (body.brandProfile.audience) bp.audience = body.brandProfile.audience;
      if (body.brandProfile.topics) bp.topics = body.brandProfile.topics;
      if (body.brandProfile.rules) bp.rules = body.brandProfile.rules;
      bp.updatedAt = new Date();
    }
  }

  memoryStore.addAuditLog({
    workspaceId,
    actorId: session?.userId || 'usr_pilot_01',
    actorName: session?.name || 'Alex Rivera',
    action: 'WORKSPACE_SETTINGS_UPDATED',
    resourceId: workspaceId,
    details: { changes: body },
  });

  return NextResponse.json({
    success: true,
    workspace,
    brandProfile: memoryStore.brandProfiles.get(workspaceId),
  });
}
