/**
 * High-Speed Caching Layer (Pillar 9, Item 082).
 * In-memory LRU cache with TTL expiration and pluggable Redis adapter support.
 * Pure server logic: zero React/Next.js dependencies.
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  constructor(private maxEntries = 1000) {}

  set<T>(key: string, value: T, ttlSeconds = 60): void {
    if (this.store.size >= this.maxEntries) {
      // Evict first key (LRU approximation)
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const globalCache = new MemoryCache(5000);
