import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  const workspaceId = session.workspaceId;

  // 1. Gather all jobs with variant metadata
  const jobs = memoryStore.getPublishingJobs(workspaceId).map((job) => {
    const variant = memoryStore.contentVariants.get(job.variantId);
    const socialAccount = memoryStore.socialAccounts.get(job.socialAccountId);
    const result = Array.from(memoryStore.publishResults.values()).find((r) => r.jobId === job.id);

    return {
      id: job.id,
      scheduledAt: job.scheduledAt,
      status: job.status,
      attempts: job.attempts,
      platform: variant?.platform || socialAccount?.platform || 'bluesky',
      accountName: socialAccount?.displayName || socialAccount?.accountId || 'Account',
      text: variant?.text || '',
      postUrl: result?.postUrl,
      error: result?.errorDetails || result?.errorCode,
    };
  });

  // 2. Gather daily topics
  const dailyTopics = memoryStore.getDailyTopics(workspaceId);

  // 3. Gather automations
  const automations = memoryStore.getContentAutomations(workspaceId);

  return NextResponse.json({
    success: true,
    calendar: {
      jobs,
      dailyTopics,
      automations,
    },
  });
}
