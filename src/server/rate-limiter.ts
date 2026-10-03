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
    private readonly refillRatePerSecond: number = 1, // 1 token per second
    private readonly maxBuckets: number = 10_000,
  ) {
    if (capacity < 1 || refillRatePerSecond < 0 || maxBuckets < 1) {
      throw new Error("invalid rate limiter configuration");
    }
  }

  public check(key: string, cost: number = 1): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      if (this.buckets.size >= this.maxBuckets) {
        const oldest = this.buckets.keys().next().value;
        if (oldest !== undefined) this.buckets.delete(oldest);
      }
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
        resetSeconds:
          this.refillRatePerSecond === 0
            ? 0
            : Math.ceil((this.capacity - bucket.tokens) / this.refillRatePerSecond),
      };
    }

    const resetSeconds =
      this.refillRatePerSecond === 0
        ? 0
        : Math.ceil((cost - bucket.tokens) / this.refillRatePerSecond);
    return {
      allowed: false,
      limit: this.capacity,
      remaining: 0,
      resetSeconds,
    };
  }

  public getActiveBucketsCount(): number {
    return this.buckets.size;
  }
}

export const globalApiRateLimiter = new TokenBucketRateLimiter(120, 2); // 120 req/min
export const rateLimiter = globalApiRateLimiter;
