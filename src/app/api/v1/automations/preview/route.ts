import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { automationEngine } from '@/lib/automations/automationEngine';

export async function POST(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const daysAhead = body.daysAhead || 7;
    const slots = automationEngine.generateSchedulePreview({
      ...body,
      workspaceId: session.workspaceId,
    }, daysAhead);

    return NextResponse.json({
      success: true,
      slots,
      totalSlots: slots.length,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
