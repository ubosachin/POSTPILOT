import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, forbiddenResponse, hasPermission } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session.role, 'canApprovePosts')) {
    return forbiddenResponse('Viewers do not have permission to approve content variants.');
  }

  const { id: variantId } = await params;
  const variant = memoryStore.contentVariants.get(variantId);

  if (!variant || variant.workspaceId !== session.workspaceId) {
    return NextResponse.json({ success: false, error: 'Content variant not found' }, { status: 404 });
  }

  variant.approvalStatus = 'approved';
  variant.updatedAt = new Date();

  memoryStore.addAuditLog({
    workspaceId: session.workspaceId,
    actorId: session.userId,
    actorName: session.name,
    action: 'VARIANT_APPROVED',
    resourceId: variantId,
    resourceType: 'contentVariant',
    details: { platform: variant.platform, textLength: variant.text.length },
  });

  return NextResponse.json({
    success: true,
    variant,
  });
}
