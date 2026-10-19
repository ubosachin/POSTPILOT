import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { DailyTopic } from '@/types';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  const url = new URL(req.url);
  const automationId = url.searchParams.get('automationId') || undefined;

  const topics = memoryStore.getDailyTopics(session.workspaceId, automationId);
  return NextResponse.json({
    success: true,
    topics,
  });
}

export async function POST(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canManageAutomations')) {
    return forbiddenResponse('Forbidden: Your role does not have permission to configure daily topics.');
  }

  try {
    const body = await req.json();
    const { automationId, date, topic, instructions } = body;

    if (!automationId || !date || !topic) {
      return NextResponse.json({ 
        success: false, 
        error: 'automationId, date (YYYY-MM-DD), and topic are required' 
      }, { status: 400 });
    }

    const id = `dt_${session.workspaceId}_${date}`;
    const dailyTopic: DailyTopic = {
      id,
      workspaceId: session.workspaceId,
      automationId,
      date,
      topic,
      instructions,
      isUsed: false,
      createdAt: new Date(),
    };

    memoryStore.dailyTopics.set(id, dailyTopic);

    memoryStore.addAuditLog({
      workspaceId: session.workspaceId,
      actorId: session.userId,
      actorName: session.name,
      action: 'DAILY_TOPIC_SAVED',
      resourceId: id,
      resourceType: 'dailyTopic',
      details: { automationId, date, topic },
    });

    return NextResponse.json({
      success: true,
      topic: dailyTopic,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
