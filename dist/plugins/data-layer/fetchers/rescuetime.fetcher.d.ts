/**
 * RescueTime Data Fetcher
 *
 * Priority: Low - "Productivity tracking for work pattern awareness"
 * Disabled by default per user preference.
 *
 * Fetches productivity scores, categories, and focus time from RescueTime API.
 * Rate limit: Hourly (via cache TTL) when enabled
 */
import type { RescueTimeData } from '../types.js';
interface RescueTimeFetcherConfig {
    apiKey: string;
    debug?: boolean;
}
/**
 * Create a RescueTime data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeRescueTimeFetcher({
 *   apiKey: await brainCreds.get('rescuetime_api_key'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Productivity score: ${data.productivityScore}`);
 * ```
 */
export declare function makeRescueTimeFetcher(config: RescueTimeFetcherConfig): () => Promise<RescueTimeData>;
/**
 * Create a mock RescueTime fetcher for development/testing
 */
export declare function makeMockRescueTimeFetcher(options?: {
    productivityScore?: number;
    productivityTrend?: 'improving' | 'stable' | 'declining';
    focusTime?: number;
    lateNightCoding?: boolean;
}): () => Promise<RescueTimeData>;
export {};
//# sourceMappingURL=rescuetime.fetcher.d.ts.map