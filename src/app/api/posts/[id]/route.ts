import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getAuthSession(req);
    if (!session) return unauthorizedResponse();

    if (!hasPermission(session.role, 'canApprovePosts')) {
      return forbiddenResponse('Forbidden: Your role does not have permission to edit or approve content.');
    }

    const workspaceId = session.workspaceId;
    const { id: variantId } = await params;
    const body = await req.json();

    const variant = memoryStore.contentVariants.get(variantId);
    if (!variant || variant.workspaceId !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 });
    }

    if (body.text !== undefined) {
      variant.text = body.text;
      variant.version += 1;
    }

    if (body.approvalStatus !== undefined) {
      variant.approvalStatus = body.approvalStatus;
    }

    if (body.quoraQuestionUrl !== undefined) {
      variant.quoraQuestionUrl = body.quoraQuestionUrl;
    }

    if (body.quoraAnswerStatus !== undefined) {
      variant.quoraAnswerStatus = body.quoraAnswerStatus;
    }

    variant.updatedAt = new Date();

    memoryStore.addAuditLog({
      workspaceId,
      actorId: session.userId,
      actorName: session.name,
      action: 'VARIANT_UPDATED',
      resourceId: variantId,
      resourceType: 'contentVariant',
      details: { platform: variant.platform, status: variant.approvalStatus },
    });

    return NextResponse.json({
      success: true,
      variant,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canApprovePosts')) {
    return forbiddenResponse('Forbidden: Your role does not have permission to delete content.');
  }

  const workspaceId = session.workspaceId;
  const { id } = await params;

  // Check if it's a contentItem or variant
  if (memoryStore.contentItems.has(id)) {
    const item = memoryStore.contentItems.get(id);
    if (item && item.workspaceId === workspaceId) {
      memoryStore.contentItems.delete(id);
      // Delete child variants
      for (const [vId, v] of memoryStore.contentVariants.entries()) {
        if (v.contentItemId === id) {
          memoryStore.contentVariants.delete(vId);
        }
      }
      return NextResponse.json({ success: true, message: 'Content item and variants deleted' });
    }
  }

  if (memoryStore.contentVariants.has(id)) {
    const variant = memoryStore.contentVariants.get(id);
    if (variant && variant.workspaceId === workspaceId) {
      memoryStore.contentVariants.delete(id);
      return NextResponse.json({ success: true, message: 'Variant deleted' });
    }
  }

  return NextResponse.json({ success: false, error: 'Resource not found' }, { status: 404 });
}
