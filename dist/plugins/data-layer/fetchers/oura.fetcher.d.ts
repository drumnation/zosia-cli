/**
 * Oura Ring Data Fetcher
 *
 * Priority 1: "Highest signal-to-noise for bonding (sleep affects everything)"
 *
 * Fetches sleep, readiness, and activity data from Oura API.
 * Rate limit: Hourly (via cache TTL)
 */
import type { OuraData } from '../types.js';
interface OuraFetcherConfig {
    accessToken: string;
    debug?: boolean;
}
/**
 * Create an Oura Ring data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeOuraFetcher({
 *   accessToken: await brainCreds.get('oura_token'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Sleep score: ${data.sleep.score}`);
 * ```
 */
export declare function makeOuraFetcher(config: OuraFetcherConfig): () => Promise<OuraData>;
/**
 * Create a mock Oura fetcher for development/testing
 */
export declare function makeMockOuraFetcher(options?: {
    sleepScore?: number;
    readinessScore?: number;
    sleepTrend?: 'improving' | 'stable' | 'declining';
}): () => Promise<OuraData>;
export {};
//# sourceMappingURL=oura.fetcher.d.ts.map