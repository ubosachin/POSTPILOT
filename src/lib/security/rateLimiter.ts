export interface RateLimitOptions {
  limit: number;      // Maximum requests allowed in the window
  windowMs: number;   // Window size in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in seconds
}

interface WindowBucket {
  tokens: number;
  lastRefill: number;
}

// In-memory token bucket store (keyed by IP/tenant identifier + route group)
const buckets: Map<string, WindowBucket> = new Map();

// Periodic cleanup of stale buckets every 5 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > 10 * 60 * 1000) {
        buckets.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}

export function checkRateLimit(
  identifier: string,
  category: 'auth' | 'ai' | 'publish' | 'api' = 'api'
): RateLimitResult {
  const configs: Record<string, RateLimitOptions> = {
    auth: { limit: 15, windowMs: 60 * 1000 },      // 15 requests / min
    ai: { limit: 25, windowMs: 60 * 1000 },        // 25 requests / min
    publish: { limit: 40, windowMs: 60 * 1000 },   // 40 requests / min
    api: { limit: 150, windowMs: 60 * 1000 },      // 150 requests / min
  };

  const config = configs[category] || configs.api;
  const key = `${category}:${identifier}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: config.limit, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens proportionally based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor((elapsed / config.windowMs) * config.limit);
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(config.limit, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  const resetTime = Math.ceil((bucket.lastRefill + config.windowMs) / 1000);

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      limit: config.limit,
      remaining: bucket.tokens,
      resetTime,
    };
  }

  return {
    allowed: false,
    limit: config.limit,
    remaining: 0,
    resetTime,
  };
}
