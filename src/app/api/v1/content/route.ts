import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  await connectToDatabase();

  const workspaceId = session.workspaceId;
  const items = await persistenceBridge.getContentItems(workspaceId);
  const variants = await persistenceBridge.getContentVariants(workspaceId);

  // Group variants by contentItemId
  const itemsWithVariants = items.map((item) => ({
    ...item,
    variants: variants.filter((v) => v.contentItemId === item.id),
  }));

  return NextResponse.json({
    success: true,
    items: itemsWithVariants,
    total: items.length,
  });
}
