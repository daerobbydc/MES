// src/lib/rateLimit.ts
// In-memory rate limiter (production: replace with Redis via @upstash/ratelimit)
// Suitable for single-instance / development deployments

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt < now) store.delete(key);
  });
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Max requests allowed per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const key = `rl:${identifier}`;

  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
  } else {
    entry.count += 1;
  }

  const remaining = Math.max(0, options.limit - entry.count);
  const allowed = entry.count <= options.limit;

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    headers: {
      "X-RateLimit-Limit": String(options.limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
      "Retry-After": allowed ? "0" : String(Math.ceil((entry.resetAt - now) / 1000)),
    },
  };
}
