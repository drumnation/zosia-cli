/**
 * Withings Scale Data Fetcher
 *
 * Priority: Medium-Low - "Body composition data for health awareness"
 *
 * Fetches weight, body fat, muscle mass data from Withings API.
 * Rate limit: Daily (via cache TTL) - weight data doesn't change frequently
 */
import type { WithingsData } from '../types.js';
interface WithingsFetcherConfig {
    accessToken: string;
    debug?: boolean;
}
/**
 * Create a Withings scale data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeWithingsFetcher({
 *   accessToken: await brainCreds.get('withings_token'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Weight: ${data.latestMeasurement?.weight}kg`);
 * ```
 */
export declare function makeWithingsFetcher(config: WithingsFetcherConfig): () => Promise<WithingsData>;
/**
 * Create a mock Withings fetcher for development/testing
 */
export declare function makeMockWithingsFetcher(options?: {
    weight?: number;
    weightTrend?: 'gaining' | 'stable' | 'losing';
    measurementFrequency?: 'daily' | 'regular' | 'sporadic';
}): () => Promise<WithingsData>;
export {};
//# sourceMappingURL=withings.fetcher.d.ts.map