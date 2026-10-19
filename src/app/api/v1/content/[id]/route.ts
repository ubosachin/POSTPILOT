import { NextRequest, NextResponse } from 'next/server';
import { PATCH as postsPatch, DELETE as postsDelete } from '@/app/api/posts/[id]/route';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return postsPatch(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return postsDelete(req, context);
}
