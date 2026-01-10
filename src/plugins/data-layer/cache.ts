/**
 * Data Layer Cache
 *
 * Simple in-memory cache with TTL support for respecting API rate limits.
 * Financial data: weekly
 * Biometric data: hourly
 */

import { CACHE_TTL_MS, type CacheTTL } from './types.js';

interface CacheEntry<T> {
  data: T;
  fetchedAt: Date;
  expiresAt: Date;
  ttl: CacheTTL;
}

/**
 * Data Layer Cache Manager
 *
 * Ensures we don't hit APIs more often than configured.
 * User requirement: "Don't hit Plaid more than once a day. Probably once a week."
 */
export class DataLayerCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    this.debug = options.debug ?? false;
  }

  /**
   * Get cached data if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      if (this.debug) {
        console.log(`[DataLayerCache] MISS: ${key} (no entry)`);
      }
      return null;
    }

    const now = new Date();
    if (now > entry.expiresAt) {
      if (this.debug) {
        const expiredAgo = Math.round((now.getTime() - entry.expiresAt.getTime()) / 1000 / 60);
        console.log(`[DataLayerCache] EXPIRED: ${key} (${expiredAgo}m ago)`);
      }
      this.cache.delete(key);
      return null;
    }

    if (this.debug) {
      const ttlRemaining = Math.round((entry.expiresAt.getTime() - now.getTime()) / 1000 / 60);
      console.log(`[DataLayerCache] HIT: ${key} (${ttlRemaining}m remaining)`);
    }

    return entry.data;
  }

  /**
   * Store data with TTL
   */
  set<T>(key: string, data: T, ttl: CacheTTL): void {
    const now = new Date();
    const ttlMs = CACHE_TTL_MS[ttl];

    const entry: CacheEntry<T> = {
      data,
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      ttl,
    };

    this.cache.set(key, entry);

    if (this.debug) {
      const ttlMinutes = Math.round(ttlMs / 1000 / 60);
      console.log(`[DataLayerCache] SET: ${key} (TTL: ${ttl} = ${ttlMinutes}m)`);
    }
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get time until cache expires (null if not cached)
   */
  getTimeUntilExpiry(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = new Date();
    if (now > entry.expiresAt) return null;

    return entry.expiresAt.getTime() - now.getTime();
  }

  /**
   * Force invalidate a key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    if (this.debug) {
      console.log(`[DataLayerCache] INVALIDATED: ${key}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    if (this.debug) {
      console.log('[DataLayerCache] CLEARED all entries');
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    sources: { key: string; ttl: CacheTTL; expiresIn: number }[];
  } {
    const now = new Date();
    const sources: { key: string; ttl: CacheTTL; expiresIn: number }[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const expiresIn = Math.max(0, entry.expiresAt.getTime() - now.getTime());
      sources.push({
        key,
        ttl: entry.ttl,
        expiresIn: Math.round(expiresIn / 1000 / 60), // minutes
      });
    }

    return {
      entries: this.cache.size,
      sources,
    };
  }
}

// Singleton cache instance
let cacheInstance: DataLayerCache | null = null;

/**
 * Get or create the cache instance
 */
export function getDataLayerCache(options?: { debug?: boolean }): DataLayerCache {
  if (!cacheInstance) {
    cacheInstance = new DataLayerCache(options);
  }
  return cacheInstance;
}

/**
 * Reset cache instance (for testing)
 */
export function resetDataLayerCache(): void {
  cacheInstance = null;
}
