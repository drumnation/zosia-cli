/**
 * Data Layer Cache
 *
 * Simple in-memory cache with TTL support for respecting API rate limits.
 * Financial data: weekly
 * Biometric data: hourly
 */
import { CACHE_TTL_MS } from './types.js';
/**
 * Data Layer Cache Manager
 *
 * Ensures we don't hit APIs more often than configured.
 * User requirement: "Don't hit Plaid more than once a day. Probably once a week."
 */
export class DataLayerCache {
    cache = new Map();
    debug;
    constructor(options = {}) {
        this.debug = options.debug ?? false;
    }
    /**
     * Get cached data if still valid
     */
    get(key) {
        const entry = this.cache.get(key);
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
    set(key, data, ttl) {
        const now = new Date();
        const ttlMs = CACHE_TTL_MS[ttl];
        const entry = {
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
    has(key) {
        return this.get(key) !== null;
    }
    /**
     * Get time until cache expires (null if not cached)
     */
    getTimeUntilExpiry(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        const now = new Date();
        if (now > entry.expiresAt)
            return null;
        return entry.expiresAt.getTime() - now.getTime();
    }
    /**
     * Force invalidate a key
     */
    invalidate(key) {
        this.cache.delete(key);
        if (this.debug) {
            console.log(`[DataLayerCache] INVALIDATED: ${key}`);
        }
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        if (this.debug) {
            console.log('[DataLayerCache] CLEARED all entries');
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const now = new Date();
        const sources = [];
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
let cacheInstance = null;
/**
 * Get or create the cache instance
 */
export function getDataLayerCache(options) {
    if (!cacheInstance) {
        cacheInstance = new DataLayerCache(options);
    }
    return cacheInstance;
}
/**
 * Reset cache instance (for testing)
 */
export function resetDataLayerCache() {
    cacheInstance = null;
}
