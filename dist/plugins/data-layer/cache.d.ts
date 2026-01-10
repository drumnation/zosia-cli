/**
 * Data Layer Cache
 *
 * Simple in-memory cache with TTL support for respecting API rate limits.
 * Financial data: weekly
 * Biometric data: hourly
 */
import { type CacheTTL } from './types.js';
/**
 * Data Layer Cache Manager
 *
 * Ensures we don't hit APIs more often than configured.
 * User requirement: "Don't hit Plaid more than once a day. Probably once a week."
 */
export declare class DataLayerCache {
    private cache;
    private debug;
    constructor(options?: {
        debug?: boolean;
    });
    /**
     * Get cached data if still valid
     */
    get<T>(key: string): T | null;
    /**
     * Store data with TTL
     */
    set<T>(key: string, data: T, ttl: CacheTTL): void;
    /**
     * Check if key exists and is valid
     */
    has(key: string): boolean;
    /**
     * Get time until cache expires (null if not cached)
     */
    getTimeUntilExpiry(key: string): number | null;
    /**
     * Force invalidate a key
     */
    invalidate(key: string): void;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        entries: number;
        sources: {
            key: string;
            ttl: CacheTTL;
            expiresIn: number;
        }[];
    };
}
/**
 * Get or create the cache instance
 */
export declare function getDataLayerCache(options?: {
    debug?: boolean;
}): DataLayerCache;
/**
 * Reset cache instance (for testing)
 */
export declare function resetDataLayerCache(): void;
//# sourceMappingURL=cache.d.ts.map