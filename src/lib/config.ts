import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3000).optional(),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/postpilot'),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for cryptographic security'),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes) for AES-256-GCM'),
  BLUESKY_SERVICE_URL: z.string().url().default('https://bsky.social'),
  CRON_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

function parseEnv(): AppConfig {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || vercelUrl || 'http://localhost:3000',
    PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/postpilot',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    JWT_SECRET: process.env.JWT_SECRET || 'postpilot-dev-jwt-super-secret-key-32-chars-minimum',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    BLUESKY_SERVICE_URL: process.env.BLUESKY_SERVICE_URL || 'https://bsky.social',
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || undefined,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || undefined,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || undefined,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
  };

  const result = configSchema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.issues.map((i) => `  - [${i.path.join('.')}]: ${i.message}`).join('\n');
    console.error(`❌ [PostPilot Config Error] Invalid environment configuration:\n${formattedErrors}`);

    if (rawEnv.NODE_ENV === 'production') {
      throw new Error(`Production startup aborted due to invalid environment variables:\n${formattedErrors}`);
    }
    return rawEnv as AppConfig;
  }

  return result.data;
}

export const appConfig: AppConfig = parseEnv();

export function isProduction(): boolean {
  return appConfig.NODE_ENV === 'production';
}

export function validateConfig(): { valid: boolean; errors: string[] } {
  const resolved = {
    NODE_ENV: process.env.NODE_ENV || appConfig.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || appConfig.NEXT_PUBLIC_APP_URL,
    PORT: process.env.PORT ? Number(process.env.PORT) : appConfig.PORT,
    MONGODB_URI: process.env.MONGODB_URI || appConfig.MONGODB_URI,
    REDIS_URL: process.env.REDIS_URL || appConfig.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET || appConfig.JWT_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || appConfig.ENCRYPTION_KEY,
    BLUESKY_SERVICE_URL: process.env.BLUESKY_SERVICE_URL || appConfig.BLUESKY_SERVICE_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || appConfig.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || appConfig.OPENAI_API_KEY,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || appConfig.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || appConfig.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || appConfig.RAZORPAY_WEBHOOK_SECRET,
  };

  const result = configSchema.safeParse(resolved);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }
  return { valid: true, errors: [] };
}
