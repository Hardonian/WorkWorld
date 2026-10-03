/**
 * WorkWorld Token Bucket Rate Limiter.
 * Pure TypeScript — in-memory with optional distributed fallback.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

interface Bucket {
  tokens: number;
  lastRefillTimestamp: number;
}

export class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity: number = 60, // 60 requests per minute
    private readonly refillRatePerSecond: number = 1 // 1 token per second
  ) {}

  public check(key: string, cost: number = 1): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefillTimestamp: now };
      this.buckets.set(key, bucket);
    } else {
      // Refill tokens based on elapsed time
      const elapsedSeconds = (now - bucket.lastRefillTimestamp) / 1000;
      const refilled = elapsedSeconds * this.refillRatePerSecond;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + refilled);
      bucket.lastRefillTimestamp = now;
    }

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      const remaining = Math.floor(bucket.tokens);
      return {
        allowed: true,
        limit: this.capacity,
        remaining,
        resetSeconds: Math.ceil((this.capacity - bucket.tokens) / this.refillRatePerSecond),
      };
    }

    const resetSeconds = Math.ceil((cost - bucket.tokens) / this.refillRatePerSecond);
    return {
      allowed: false,
      limit: this.capacity,
      remaining: 0,
      resetSeconds,
    };
  }
}

export const globalApiRateLimiter = new TokenBucketRateLimiter(120, 2); // 120 req/min
