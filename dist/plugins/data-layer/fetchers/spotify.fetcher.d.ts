/**
 * Spotify Data Fetcher
 *
 * Priority 2: "Music choices reveal mood in ways words often can't"
 *
 * Fetches recently played, currently playing, and audio features from Spotify API.
 * Rate limit: Hourly (via cache TTL)
 */
import type { SpotifyData } from '../types.js';
interface SpotifyFetcherConfig {
    accessToken: string;
    debug?: boolean;
}
/**
 * Create a Spotify data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeSpotifyFetcher({
 *   accessToken: await brainCreds.get('spotify_token'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Mood valence: ${data.audioFeatures.valence}`);
 * ```
 */
export declare function makeSpotifyFetcher(config: SpotifyFetcherConfig): () => Promise<SpotifyData>;
/**
 * Create a mock Spotify fetcher for development/testing
 */
export declare function makeMockSpotifyFetcher(options?: {
    valence?: number;
    moodTrend?: 'upbeat' | 'mellow' | 'mixed';
    isKidsMusic?: boolean;
    currentlyPlaying?: {
        track: string;
        artist: string;
    } | null;
}): () => Promise<SpotifyData>;
export {};
//# sourceMappingURL=spotify.fetcher.d.ts.map