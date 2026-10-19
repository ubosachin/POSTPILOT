import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { creditEngine } from '@/lib/credits/creditEngine';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  try {
    const ledger = await creditEngine.getLedger(session.workspaceId);
    return NextResponse.json({
      success: true,
      ledger,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, success: false }, { status: 500 });
  }
}
