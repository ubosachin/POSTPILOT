import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { processDueJobs } from '@/lib/queue/publisherQueue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allows up to 60s for batch processing on Vercel

/**
 * Vercel Cron handler for scheduled publishing jobs.
 * Vercel triggers this endpoint automatically via GET on the schedule defined in vercel.json.
 */
export async function GET(req: NextRequest) {
  return handleCronTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleCronTrigger(req);
}

async function handleCronTrigger(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is configured in environment variables, enforce authentication
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing Cron secret.' },
      { status: 401 }
    );
  }

  try {
    // 1. Ensure database is connected and state hydrated
    await connectToDatabase();

    // 2. Process all pending jobs scheduled for <= now
    const result = await processDueJobs();

    console.log(`[Vercel Cron] Processed ${result.processed} due publishing jobs.`);

    return NextResponse.json({
      success: true,
      service: 'postpilot-vercel-cron',
      timestamp: new Date().toISOString(),
      processedCount: result.processed,
      jobs: result.results,
    });
  } catch (err) {
    console.error('[Vercel Cron] Error during scheduled job execution:', err);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
