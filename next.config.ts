import type { NextConfig } from "next";

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_URL;

const nextConfig: NextConfig = {
  // Use standalone mode for Docker/PM2; leave undefined for Vercel serverless
  ...(isVercel ? {} : { output: 'standalone' }),
  reactStrictMode: true,
  serverExternalPackages: ['bullmq', 'ioredis', 'mongoose'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
