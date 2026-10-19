import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore } from '@/lib/db';
import { executePublishingJob } from '@/lib/queue/publisherQueue';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getAuthSession(req);
    if (!session) return unauthorizedResponse();

    if (!hasPermission(session.role, 'canPublishJobs')) {
      return forbiddenResponse('Forbidden: Your role does not have permission to trigger or retry publishing jobs.');
    }

    await connectToDatabase();

    const workspaceId = session.workspaceId;
    const { id: jobId } = await params;

    const job = memoryStore.publishingJobs.get(jobId);
    if (!job || job.workspaceId !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    job.status = 'scheduled';
    job.scheduledAt = new Date();

    const res = await executePublishingJob(job.id);
    return NextResponse.json({
      success: res.success,
      job,
      result: res,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
