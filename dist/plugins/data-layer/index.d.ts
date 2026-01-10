/**
 * Data Layer Plugin
 *
 * Feeds real-time context about Dave's life into Zosia's awareness.
 * Transforms Zosia from "AI that knows what you told it" to "AI that observes your life."
 *
 * Data Sources:
 * - Oura Ring (sleep, HRV, readiness) - hourly
 * - Spotify (music, mood signals) - hourly
 * - Calendar (custody schedule, events) - hourly
 * - Financial (Plaid via Cheddar) - weekly
 * - RescueTime (productivity) - hourly
 */
import { type DataLayerConfig, type DataLayerContext, type DataLayerEpisode } from './types.js';
/**
 * Credentials needed for real API access
 *
 * In production, these should come from brain-creds or environment variables:
 * - brain-creds get oura_token
 * - brain-creds get spotify_token
 * - brain-creds get google_calendar_token
 * - brain-creds get gmail_token
 * - brain-creds get withings_token
 * - brain-creds get rescuetime_api_key
 * - brain-creds get plaid_client_id, plaid_secret, plaid_access_token
 */
export interface DataLayerCredentials {
    oura?: {
        accessToken: string;
    };
    spotify?: {
        accessToken: string;
    };
    calendar?: {
        accessToken: string;
        calendarId?: string;
        custodyCalendarId?: string;
    };
    gmail?: {
        accessToken: string;
        userId?: string;
        maxResults?: number;
    };
    withings?: {
        accessToken: string;
    };
    rescueTime?: {
        apiKey: string;
    };
    plaid?: {
        clientId: string;
        secret: string;
        accessToken: string;
    };
}
export interface DataLayerPlugin {
    id: 'data-layer';
    name: 'Data Layer';
    description: string;
    version: string;
    init: (config?: Partial<DataLayerConfig>) => Promise<void>;
    start: () => Promise<void>;
    stop: () => void;
    getContext: () => DataLayerContext;
    getSystemPromptInjection: () => string;
    getThinkingInjection: () => string;
    refresh: (sourceId?: string) => Promise<void>;
    isRunning: () => boolean;
    getCacheStats: () => {
        entries: number;
        sources: Array<{
            key: string;
            ttl: string;
            expiresIn: number;
        }>;
    };
}
/**
 * Create the Data Layer Plugin
 *
 * @example
 * ```typescript
 * // With mock data (for development)
 * const plugin = makeDataLayerPlugin({ useMocks: true });
 *
 * // With real API credentials
 * const plugin = makeDataLayerPlugin({
 *   credentials: {
 *     oura: { accessToken: await brainCreds.get('oura_token') },
 *     spotify: { accessToken: await brainCreds.get('spotify_token') },
 *     calendar: { accessToken: await brainCreds.get('google_calendar_token') },
 *     plaid: {
 *       clientId: await brainCreds.get('plaid_client_id'),
 *       secret: await brainCreds.get('plaid_secret'),
 *       accessToken: await brainCreds.get('plaid_access_token'),
 *     },
 *   },
 * });
 *
 * await plugin.init();
 * await plugin.start();
 *
 * // Get context for We-Layer
 * const ctx = plugin.getContext();
 * console.log('Sleep score:', ctx.oura?.sleep.score);
 * ```
 */
export declare function makeDataLayerPlugin(options?: {
    config?: Partial<DataLayerConfig>;
    credentials?: DataLayerCredentials;
    useMocks?: boolean;
    onEpisode?: (episode: DataLayerEpisode) => Promise<void>;
}): DataLayerPlugin;
export * from './types.js';
export { DataLayerWorker, makeDataLayerWorker } from './worker.js';
export { DataLayerCache, getDataLayerCache, resetDataLayerCache } from './cache.js';
export { makeOuraFetcher, makeMockOuraFetcher, makeSpotifyFetcher, makeMockSpotifyFetcher, makePlaidFetcher, makeMockPlaidFetcher, makeCalendarFetcher, makeMockCalendarFetcher, makeGmailFetcher, makeMockGmailFetcher, makeWithingsFetcher, makeMockWithingsFetcher, makeRescueTimeFetcher, makeMockRescueTimeFetcher, } from './fetchers/index.js';
//# sourceMappingURL=index.d.ts.map