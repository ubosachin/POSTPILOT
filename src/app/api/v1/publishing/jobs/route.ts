import { NextRequest, NextResponse } from 'next/server';
import { GET as getJobs } from '@/app/api/jobs/route';
import { POST as publishPost } from '@/app/api/publish/route';

export async function GET(req: NextRequest) {
  return getJobs(req);
}

export async function POST(req: NextRequest) {
  return publishPost(req);
}
