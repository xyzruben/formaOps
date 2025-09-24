// Simple in-memory cache with TTL for database query results
// In production, this would be replaced with Redis or similar

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hitCount: number;
}

export interface CacheOptions {
  ttl?: number; // Default 5 minutes
  maxEntries?: number; // Default 100 entries
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxEntries = 100;

  constructor(private options: CacheOptions = {}) {}

  /**
   * Get cached result if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Increment hit count
    entry.hitCount++;
    return entry.data as T;
  }

  /**
   * Set cache entry with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.ttl ?? this.defaultTTL,
      hitCount: 0,
    };

    // Enforce max entries limit
    if (this.cache.size >= (this.options.maxEntries ?? this.maxEntries)) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
  }

  /**
   * Remove entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{
      key: string;
      hitCount: number;
      age: number;
      ttl: number;
    }>;
    hitRate: number;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hitCount: entry.hitCount,
      age: now - entry.timestamp,
      ttl: entry.ttl,
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalRequests = entries.length + totalHits;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      entries,
      hitRate,
    };
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Evict the oldest entry to make room
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(operation: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');

    return `${operation}:${sortedParams}`;
  }

  /**
   * Wrapper function to cache async operations
   */
  async cached<T>(
    key: string,
    operation: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute operation and cache result
    const result = await operation();
    this.set(key, result, ttl);
    return result;
  }
}

// Export singleton instance
export const queryCache = new QueryCache({
  ttl: 5 * 60 * 1000, // 5 minutes default
  maxEntries: 200, // Increased for production use
});

// Cleanup expired entries every 5 minutes
if (typeof window === 'undefined') {
  // Only run in server environment
  setInterval(
    () => {
      const removed = queryCache.cleanup();
      if (removed > 0) {
        // Cache cleanup: removed expired entries (removed console.log for linting compliance)
      }
    },
    5 * 60 * 1000
  );
}
