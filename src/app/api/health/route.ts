import { NextResponse } from 'next/server';

export async function GET() {
  const uptimeSeconds = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();

  return NextResponse.json({
    status: 'ok',
    service: 'postpilot',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds}s`,
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memory: {
        rssMb: Math.round(memUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
    },
  });
}
