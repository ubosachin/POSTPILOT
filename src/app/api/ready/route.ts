import { NextResponse } from 'next/server';
import { connectToDatabase, persistenceBridge } from '@/lib/db';
import { getQueueStatus } from '@/lib/queue/publisherQueue';
import { validateConfig } from '@/lib/config';

export async function GET() {
  const startTime = Date.now();

  // 1. Check database readiness
  let dbStatus = 'healthy';
  let dbMode = 'memory_fallback';
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    const dbRes = await connectToDatabase();
    dbLatencyMs = Date.now() - dbStart;
    dbMode = dbRes.isMemoryFallback ? 'resilient_memory_store' : 'mongodb_atlas_connected';
  } catch (err) {
    dbStatus = 'degraded';
    dbMode = `error: ${(err as Error).message}`;
  }

  // 2. Check queue readiness
  const queueStatus = getQueueStatus();

  // 3. Check environment configuration validation
  const configValidation = validateConfig();

  const totalLatencyMs = Date.now() - startTime;
  const isReady = dbStatus === 'healthy' && configValidation.valid;

  return NextResponse.json(
    {
      ready: isReady,
      status: isReady ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      latencyMs: totalLatencyMs,
      subsystems: {
        database: {
          status: dbStatus,
          mode: dbMode,
          latencyMs: dbLatencyMs,
          mongoActive: persistenceBridge.isMongoActive(),
        },
        queue: {
          status: 'healthy',
          mode: queueStatus.mode,
          redisConnected: queueStatus.isRedisConnected,
          pendingJobs: queueStatus.pendingJobs,
        },
        config: {
          status: configValidation.valid ? 'valid' : 'invalid',
          errors: configValidation.errors,
        },
      },
    },
    { status: isReady ? 200 : 503 }
  );
}
