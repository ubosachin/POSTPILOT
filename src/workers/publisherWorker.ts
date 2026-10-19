import { processDueJobs, executePublishingJob } from '../lib/queue/publisherQueue';
import { connectToDatabase } from '../lib/db';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';

console.log('🚀 [PostPilot Production Worker] Initializing...');

let isRunning = true;
let bullWorker: Worker | null = null;

async function initWorker() {
  // 1. Establish database connection for persistent worker operations
  try {
    const dbStatus = await connectToDatabase();
    console.log(`[Worker] Database initialized (Mode: ${dbStatus.isMemoryFallback ? 'Resilient In-Memory Fallback' : 'MongoDB Atlas Connected'}).`);
  } catch (err) {
    console.warn('[Worker] Database connection warning:', (err as Error).message);
  }

  // 2. Initialize BullMQ Worker if Redis URL is configured
  if (process.env.REDIS_URL) {
    try {
      const redisConnection = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy: () => 2000,
        lazyConnect: true,
      });

      redisConnection.on('connect', () => {
        console.log('[Worker] Connected to Redis. Initializing BullMQ Worker...');
        if (!bullWorker) {
          bullWorker = new Worker(
            'postpilot-publishing-jobs',
            async (job: Job) => {
              console.log(`[Worker/BullMQ] Processing job ${job.id} for payload:`, job.data);
              const result = await executePublishingJob(job.data.jobId);
              if (!result.success) {
                throw new Error(result.error || 'Job failed');
              }
              return result;
            },
            {
              connection: redisConnection,
              concurrency: 5,
            }
          );

          bullWorker.on('completed', (job: Job) => {
            console.log(`[Worker/BullMQ] ✅ Job ${job.id} published successfully`);
          });

          bullWorker.on('failed', (job: Job | undefined, err: Error) => {
            console.error(`[Worker/BullMQ] ❌ Job ${job?.id} failed:`, err.message);
          });
        }
      });

      redisConnection.on('error', () => {
        // Redis not reachable, will fall back to in-process polling loop below
      });

      await redisConnection.connect().catch(() => {});
    } catch {
      // Redis unavailable; fallback active
    }
  }

  console.log('⚡ [Worker] Polling loop active for scheduled publishing jobs...');
  runPollingLoop();
}

async function runPollingLoop() {
  while (isRunning) {
    try {
      const { processed, results } = await processDueJobs();
      if (processed > 0) {
        console.log(`[Worker] [${new Date().toISOString()}] Processed ${processed} due job(s):`, results);
      }
    } catch (err) {
      console.error('[Worker] Error in job execution loop:', err);
    }

    // Sleep for 5 seconds between ticks
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`\n🛑 [Worker] ${signal} received. Initiating graceful shutdown...`);
  isRunning = false;
  if (bullWorker) {
    await bullWorker.close().catch(() => {});
  }
  console.log('✅ [Worker] Clean shutdown complete.');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('🔥 [Worker] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔥 [Worker] Unhandled promise rejection:', reason);
});

initWorker();
