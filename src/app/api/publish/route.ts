import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, forbiddenResponse, hasPermission } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { persistenceBridge } from '@/lib/db/persistence';
import { executePublishingJob } from '@/lib/queue/publisherQueue';
import { PublishingJob } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = getAuthSession(req);
    if (!session) {
      return unauthorizedResponse('Authentication required. Please log in.');
    }
    if (!hasPermission(session.role, 'canPublishJobs')) {
      return forbiddenResponse('Viewers do not have permission to publish content. Please contact an admin.');
    }
    const workspaceId = session.workspaceId;
    const body = await req.json();

    const { variantId, socialAccountId, publishNow = true, scheduledAt } = body;

    if (!variantId) {
      return NextResponse.json({ success: false, error: 'variantId is required' }, { status: 400 });
    }

    const variant = memoryStore.contentVariants.get(variantId);
    if (!variant || variant.workspaceId !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Variant not found in this workspace' }, { status: 404 });
    }

    // Handle Quora manual publishing confirmation
    if (variant.platform === 'quora') {
      variant.approvalStatus = 'approved';
      variant.quoraAnswerStatus = 'manually_published';
      variant.updatedAt = new Date();

      memoryStore.addAuditLog({
        workspaceId,
        actorId: session?.userId || 'usr_pilot_01',
        actorName: session?.name || 'Alex Rivera',
        action: 'QUORA_MANUAL_PUBLISH_CONFIRMED',
        resourceId: variantId,
        details: { questionUrl: variant.quoraQuestionUrl },
      });

      return NextResponse.json({
        success: true,
        message: 'Quora answer marked as manually published.',
        variant,
      });
    }

    // For automated platforms (Bluesky, X), a connected social account is required
    let targetAccountId = socialAccountId;
    if (!targetAccountId) {
      // Find default active account for this platform
      const account = memoryStore.getSocialAccounts(workspaceId).find(
        (a) => a.platform === variant.platform && a.status === 'active'
      );
      if (!account) {
        return NextResponse.json({
          success: false,
          error: `No connected ${variant.platform.toUpperCase()} account found. Please connect one first.`,
        }, { status: 400 });
      }
      targetAccountId = account.id;
    }

    const socialAccount = memoryStore.socialAccounts.get(targetAccountId);
    if (!socialAccount || socialAccount.workspaceId !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Social account not found' }, { status: 404 });
    }

    // Idempotency check: unique { variantId, socialAccountId }
    const idempotencyKey = `job_${variantId}_${targetAccountId}`;
    let job = Array.from(memoryStore.publishingJobs.values()).find(
      (j) => j.idempotencyKey === idempotencyKey
    );

    if (job && job.status === 'published') {
      return NextResponse.json({
        success: true,
        message: 'This variant has already been published to this account.',
        job,
      });
    }

    const jobScheduleTime = publishNow ? new Date() : new Date(scheduledAt || Date.now());

    if (!job) {
      job = {
        id: `job_${Date.now()}`,
        workspaceId,
        variantId,
        socialAccountId: targetAccountId,
        scheduledAt: jobScheduleTime,
        status: 'scheduled',
        attempts: 0,
        maxAttempts: 5,
        idempotencyKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.publishingJobs.set(job.id, job);
    } else {
      job.scheduledAt = jobScheduleTime;
      job.status = 'scheduled';
      job.updatedAt = new Date();
    }

    // Approve the variant automatically upon scheduling or publishing
    variant.approvalStatus = 'approved';
    persistenceBridge.persistPublishingJob(job).catch(() => {});
    persistenceBridge.persistContentVariant(variant).catch(() => {});

    if (publishNow) {
      // Execute vertical slice publish immediately
      const executionResult = await executePublishingJob(job.id);

      if (executionResult.success) {
        return NextResponse.json({
          success: true,
          message: `Successfully published to ${socialAccount.platform.toUpperCase()}!`,
          job,
          postUrl: executionResult.postUrl,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: executionResult.error,
          job,
        }, { status: 422 });
      }
    } else {
      memoryStore.addAuditLog({
        workspaceId,
        actorId: session?.userId || 'usr_pilot_01',
        actorName: session?.name || 'Alex Rivera',
        action: 'JOB_SCHEDULED',
        resourceId: job.id,
        resourceType: 'publishingJob',
        details: { platform: socialAccount.platform, scheduledAt: jobScheduleTime },
      });

      return NextResponse.json({
        success: true,
        message: `Post successfully scheduled for ${jobScheduleTime.toLocaleString()}`,
        job,
      });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
