import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  await connectToDatabase();

  const workspaceId = session.workspaceId;

  const jobs = memoryStore.getPublishingJobs(workspaceId).map((job) => {
    const variant = memoryStore.contentVariants.get(job.variantId);
    const socialAccount = memoryStore.socialAccounts.get(job.socialAccountId);
    const result = Array.from(memoryStore.publishResults.values()).find((r) => r.jobId === job.id);

    return {
      ...job,
      variantText: variant?.text || '',
      platform: variant?.platform || socialAccount?.platform || 'bluesky',
      accountName: socialAccount?.displayName || socialAccount?.accountId || 'Account',
      postUrl: result?.postUrl,
      errorCode: result?.errorCode,
      errorDetails: result?.errorDetails,
    };
  });

  return NextResponse.json({
    success: true,
    jobs,
  });
}
