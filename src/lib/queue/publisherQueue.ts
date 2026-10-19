import { memoryStore } from '../db/memoryStore';
import { persistenceBridge } from '../db/persistence';
import { decryptCredentials } from '../crypto';
import { blueskyAdapter, BlueskyCredentials } from '../adapters/bluesky';
import { xAdapter, XCredentials } from '../adapters/x';
import { PublishingJob, PublishResult, UsageRecord } from '@/types';
import { PublishingJobModel } from '../models';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export interface ExecuteJobResult {
  success: boolean;
  jobId: string;
  status: string;
  postUrl?: string;
  error?: string;
}

// Optional BullMQ Connection when Redis is online
let bullQueue: Queue | null = null;
let isRedisConnected = false;

function initBullMQ() {
  if (bullQueue || !process.env.REDIS_URL) return;
  try {
    const redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop reconnecting if not available
        return Math.min(times * 500, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      isRedisConnected = true;
      console.log('[PublisherQueue] Redis connected for BullMQ queue.');
    });

    redis.on('error', () => {
      isRedisConnected = false;
    });

    bullQueue = new Queue('postpilot-publishing-jobs', {
      connection: redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
        removeOnComplete: true,
      },
    });
  } catch {
    isRedisConnected = false;
    bullQueue = null;
  }
}

initBullMQ();

export function getQueueStatus(): { mode: 'bullmq' | 'in_process'; isRedisConnected: boolean; pendingJobs: number } {
  const pendingJobs = Array.from(memoryStore.publishingJobs.values()).filter(
    (j) => j.status === 'scheduled' || j.status === 'retry_wait'
  ).length;

  return {
    mode: isRedisConnected && bullQueue ? 'bullmq' : 'in_process',
    isRedisConnected,
    pendingJobs,
  };
}

/**
 * Atomically executes a publishing job:
 * 1. Checks lock and claims job
 * 2. Checks tenant quota
 * 3. Dispatches to platform adapter (Bluesky / X)
 * 4. Records durable publishResult and updates status
 */
export async function executePublishingJob(jobId: string): Promise<ExecuteJobResult> {
  const job = memoryStore.publishingJobs.get(jobId);
  if (!job) {
    return { success: false, jobId, status: 'not_found', error: 'Job not found' };
  }

  if (job.status === 'published') {
    return { success: true, jobId, status: 'published', error: 'Job already published' };
  }

  // 1. Claim job atomically
  job.status = 'publishing';
  job.attempts += 1;
  job.lockedAt = new Date();
  job.lockedBy = `worker_${process.pid}`;
  job.updatedAt = new Date();

  const variant = memoryStore.contentVariants.get(job.variantId);
  const socialAccount = memoryStore.socialAccounts.get(job.socialAccountId);

  if (!variant || !socialAccount) {
    job.status = 'failed';
    return {
      success: false,
      jobId,
      status: 'failed',
      error: 'Missing associated variant or social account',
    };
  }

  // 2. Check workspace quota
  const currentPeriod = new Date().toISOString().substring(0, 7);
  const metricName = socialAccount.platform === 'bluesky' ? 'bluesky_posts' : 'x_posts';
  const usageKey = `${job.workspaceId}_${currentPeriod}_${metricName}`;
  const usage = memoryStore.usageRecords.get(usageKey);

  if (usage && usage.quantity >= usage.limit) {
    job.status = 'failed';
    memoryStore.addAuditLog({
      workspaceId: job.workspaceId,
      actorId: 'system',
      actorName: 'Scheduler Worker',
      action: 'QUOTA_EXCEEDED_PUBLISH_BLOCKED',
      resourceId: jobId,
      details: { metric: metricName, current: usage.quantity, limit: usage.limit },
    });
    return {
      success: false,
      jobId,
      status: 'failed',
      error: `Monthly publishing quota exceeded for ${metricName} (${usage.quantity}/${usage.limit})`,
    };
  }

  // 3. Dispatch to platform adapter
  try {
    const creds = decryptCredentials<BlueskyCredentials & XCredentials>(socialAccount.encryptedCredentials);

    let publishSuccess = false;
    let postUrl: string | undefined;
    let platformPostId: string | undefined;
    let errorCode: string | undefined;
    let errorDetails: string | undefined;

    if (socialAccount.platform === 'bluesky') {
      const bskyRes = await blueskyAdapter.publishPost(creds, variant.text);
      publishSuccess = bskyRes.success;
      postUrl = bskyRes.postUrl;
      platformPostId = bskyRes.cid;
      errorCode = bskyRes.errorCode;
      errorDetails = bskyRes.errorDetails;
    } else if (socialAccount.platform === 'x') {
      const xRes = await xAdapter.publishTweet(creds, variant.text);
      publishSuccess = xRes.success;
      postUrl = xRes.postUrl;
      platformPostId = xRes.tweetId;
      errorCode = xRes.errorCode;
      errorDetails = xRes.errorDetails;
    }

    if (publishSuccess) {
      // 4. Record Success
      job.status = 'published';
      job.updatedAt = new Date();

      const result: PublishResult = {
        id: `res_${Date.now()}`,
        jobId,
        workspaceId: job.workspaceId,
        platform: socialAccount.platform,
        platformPostId,
        postUrl,
        publishedAt: new Date(),
      };
      memoryStore.publishResults.set(result.id, result);

      // Update variant status
      variant.approvalStatus = 'approved';
      variant.updatedAt = new Date();

      // Increment quota usage
      if (usage) {
        usage.quantity += 1;
      } else {
        const newUsage: UsageRecord = {
          id: `ur_${Date.now()}`,
          workspaceId: job.workspaceId,
          period: currentPeriod,
          metric: metricName as UsageRecord['metric'],
          quantity: 1,
          limit: 300,
        };
        memoryStore.usageRecords.set(usageKey, newUsage);
      }

      memoryStore.addAuditLog({
        workspaceId: job.workspaceId,
        actorId: 'system',
        actorName: 'Publishing Worker',
        action: 'POST_PUBLISHED',
        resourceId: jobId,
        resourceType: 'publishingJob',
        details: { platform: socialAccount.platform, postUrl, platformPostId },
      });

      // Persist to MongoDB if connected
      persistenceBridge.persistPublishingJob(job).catch(() => {});
      persistenceBridge.persistPublishResult(result).catch(() => {});

      return {
        success: true,
        jobId,
        status: 'published',
        postUrl,
      };
    } else {
      // Handle Failure & Backoff
      if (errorCode === 'AUTH_FAILED') {
        socialAccount.status = 'needs_reauthorization';
        socialAccount.errorMessage = errorDetails;
        job.status = 'needs_reauthorization';
      } else if (job.attempts < job.maxAttempts) {
        job.status = 'retry_wait';
        // Exponential backoff: 30s * 2^(attempts-1)
        const delayMs = 30 * 1000 * Math.pow(2, job.attempts - 1);
        job.scheduledAt = new Date(Date.now() + delayMs);
      } else {
        job.status = 'failed';
      }

      const failResult: PublishResult = {
        id: `res_err_${Date.now()}`,
        jobId,
        workspaceId: job.workspaceId,
        platform: socialAccount.platform,
        errorCode,
        errorDetails,
      };
      memoryStore.publishResults.set(failResult.id, failResult);

      // Persist failure state
      persistenceBridge.persistPublishingJob(job).catch(() => {});
      persistenceBridge.persistPublishResult(failResult).catch(() => {});

      memoryStore.addAuditLog({
        workspaceId: job.workspaceId,
        actorId: 'system',
        actorName: 'Publishing Worker',
        action: 'POST_PUBLISH_FAILED',
        resourceId: jobId,
        resourceType: 'publishingJob',
        details: { platform: socialAccount.platform, errorCode, errorDetails, attempts: job.attempts },
      });

      return {
        success: false,
        jobId,
        status: job.status,
        error: errorDetails || errorCode || 'Publishing failed',
      };
    }
  } catch (err) {
    job.status = 'failed';
    const errMessage = (err as Error).message;
    return {
      success: false,
      jobId,
      status: 'failed',
      error: errMessage,
    };
  }
}

/**
 * Polls and runs all due jobs in the queue.
 * In serverless environments (Vercel Cron), this ensures MongoDB-persisted scheduled
 * jobs are loaded into memory and executed before the serverless function exits.
 */
export async function processDueJobs(): Promise<{ processed: number; results: ExecuteJobResult[] }> {
  const now = new Date();

  // If MongoDB is active, fetch any due jobs from database (essential for stateless Vercel Serverless)
  if (persistenceBridge.isMongoActive()) {
    try {
      const mongoDueJobs = await PublishingJobModel.find({
        status: { $in: ['scheduled', 'retry_wait'] },
        scheduledAt: { $lte: now },
      }).lean();

      for (const doc of mongoDueJobs) {
        const jobId = (doc as any).id || (doc as any)._id?.toString();
        if (jobId && !memoryStore.publishingJobs.has(jobId)) {
          memoryStore.publishingJobs.set(jobId, {
            id: jobId,
            workspaceId: doc.workspaceId,
            variantId: doc.variantId,
            socialAccountId: doc.socialAccountId,
            scheduledAt: new Date(doc.scheduledAt),
            status: doc.status as any,
            attempts: doc.attempts || 0,
            maxAttempts: doc.maxAttempts || 5,
            idempotencyKey: doc.idempotencyKey,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
          });
        }
      }
    } catch (err) {
      console.warn('[PublisherQueue] Could not fetch due jobs from MongoDB:', (err as Error).message);
    }
  }

  const dueJobs = Array.from(memoryStore.publishingJobs.values()).filter(
    (j) => (j.status === 'scheduled' || j.status === 'retry_wait') && new Date(j.scheduledAt) <= now
  );

  const results: ExecuteJobResult[] = [];
  for (const job of dueJobs) {
    const res = await executePublishingJob(job.id);
    results.push(res);
  }

  return { processed: results.length, results };
}
