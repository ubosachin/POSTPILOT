import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  const workspaceId = session.workspaceId;

  const items = memoryStore.getContentItems(workspaceId);
  const variants = memoryStore.getContentVariants(workspaceId);

  // Group variants by contentItemId
  const postsWithVariants = items.map((item) => {
    const itemVariants = variants.filter((v) => v.contentItemId === item.id);
    return {
      ...item,
      variants: itemVariants,
    };
  });

  return NextResponse.json({
    success: true,
    posts: postsWithVariants,
  });
}
