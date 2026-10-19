import { NextRequest, NextResponse } from 'next/server';
import { POST as generatePost } from '@/app/api/ai/generate/route';

export async function POST(req: NextRequest) {
  return generatePost(req);
}
