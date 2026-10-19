import { NextRequest, NextResponse } from 'next/server';
import { GET as getSocialAccounts } from '@/app/api/social-accounts/route';

export async function GET(req: NextRequest) {
  return getSocialAccounts(req);
}
