import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { creditEngine } from '@/lib/credits/creditEngine';
import { CREDIT_POLICY, CREDIT_PACKAGES } from '@/lib/credits/pricing';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  try {
    const wallet = await creditEngine.getWallet(session.workspaceId);
    return NextResponse.json({
      success: true,
      wallet,
      policy: {
        costs: CREDIT_POLICY.COSTS,
        freeSignupCredits: CREDIT_POLICY.DEFAULT_FREE_SIGNUP_CREDITS,
      },
      packages: CREDIT_PACKAGES,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, success: false }, { status: 500 });
  }
}
