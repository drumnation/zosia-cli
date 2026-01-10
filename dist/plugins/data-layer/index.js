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
import { DEFAULT_DATA_LAYER_CONFIG, } from './types.js';
import { makeDataLayerWorker } from './worker.js';
import { getDataLayerCache } from './cache.js';
// Import fetchers
import { makeOuraFetcher, makeMockOuraFetcher, } from './fetchers/oura.fetcher.js';
import { makeSpotifyFetcher, makeMockSpotifyFetcher, } from './fetchers/spotify.fetcher.js';
import { makeCalendarFetcher, makeMockCalendarFetcher, } from './fetchers/calendar.fetcher.js';
import { makePlaidFetcher, makeMockPlaidFetcher, } from './fetchers/plaid.fetcher.js';
import { makeGmailFetcher, makeMockGmailFetcher, } from './fetchers/gmail.fetcher.js';
import { makeWithingsFetcher, makeMockWithingsFetcher, } from './fetchers/withings.fetcher.js';
import { makeRescueTimeFetcher, makeMockRescueTimeFetcher, } from './fetchers/rescuetime.fetcher.js';
// ============================================================================
// Plugin Implementation
// ============================================================================
let worker = null;
let config = DEFAULT_DATA_LAYER_CONFIG;
let episodeHandler = null;
let storedCredentials;
let useMocksFlag;
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
export function makeDataLayerPlugin(options) {
    const pluginConfig = {
        ...DEFAULT_DATA_LAYER_CONFIG,
        ...options?.config,
        sources: {
            ...DEFAULT_DATA_LAYER_CONFIG.sources,
            ...options?.config?.sources,
        },
    };
    config = pluginConfig;
    episodeHandler = options?.onEpisode ?? defaultEpisodeHandler;
    storedCredentials = options?.credentials;
    useMocksFlag = options?.useMocks;
    return {
        id: 'data-layer',
        name: 'Data Layer',
        description: 'Real-time context from external APIs (Oura, Spotify, Calendar, Financial)',
        version: '1.0.0',
        init: async (customConfig) => {
            if (customConfig) {
                config = { ...config, ...customConfig };
            }
            worker = makeDataLayerWorker({
                config,
                onEpisode: episodeHandler,
                onError: (sourceId, error) => {
                    console.error(`[DataLayerPlugin] ${sourceId} error:`, error.message);
                },
            });
            // Register fetchers (uses real APIs when credentials provided, mocks otherwise)
            registerFetchers(worker, storedCredentials, useMocksFlag);
            if (config.debug) {
                console.log('[DataLayerPlugin] Initialized with config:', JSON.stringify(config.sources, null, 2));
            }
        },
        start: async () => {
            if (!worker) {
                throw new Error('Data Layer Plugin not initialized. Call init() first.');
            }
            await worker.start();
        },
        stop: () => {
            worker?.stop();
        },
        getContext: () => {
            return worker?.getContext() ?? createEmptyContext();
        },
        getSystemPromptInjection: () => {
            const ctx = worker?.getContext();
            if (!ctx)
                return '';
            const parts = [];
            // Biometric summary
            if (ctx.biometricSummary) {
                parts.push(`[Biometrics] ${ctx.biometricSummary}`);
            }
            // Mood summary
            if (ctx.moodSummary) {
                parts.push(`[Mood Signals] ${ctx.moodSummary}`);
            }
            // Schedule summary
            if (ctx.scheduleSummary) {
                parts.push(`[Schedule] ${ctx.scheduleSummary}`);
            }
            // Custody status (high priority)
            if (ctx.calendar?.custody) {
                const custody = ctx.calendar.custody;
                const weekStatus = custody.isWeekOn ? 'Week ON (kids present)' : 'Week OFF';
                parts.push(`[Custody] ${weekStatus}`);
                if (custody.daysUntilTransition <= 2) {
                    const transition = custody.isWeekOn ? 'kids leave' : 'kids arrive';
                    parts.push(`Custody transition: ${transition} in ${custody.daysUntilTransition} days`);
                }
            }
            if (parts.length === 0)
                return '';
            return `---
## Live Context (Data Layer)

${parts.join('\n')}

---`;
        },
        getThinkingInjection: () => {
            const ctx = worker?.getContext();
            if (!ctx)
                return '';
            const thoughts = [];
            // Biometric concerns
            if (ctx.oura && ctx.oura.sleep.score < 70) {
                thoughts.push(`*notices their sleep score is ${ctx.oura.sleep.score}/100*`);
            }
            if (ctx.oura && ctx.oura.patterns.hrvTrend === 'down') {
                thoughts.push(`*their HRV is trending down - stress indicator*`);
            }
            // Mood signals
            if (ctx.spotify && ctx.spotify.patterns.moodTrend === 'mellow') {
                thoughts.push(`*they've been listening to mellower music lately*`);
            }
            // Custody awareness
            if (ctx.calendar?.custody.daysUntilTransition === 0) {
                const transition = ctx.calendar.custody.isWeekOn ? 'the kids leave today' : 'the kids arrive today';
                thoughts.push(`*remembers ${transition} - a transition day*`);
            }
            return thoughts.join('\n');
        },
        refresh: async (sourceId) => {
            if (!worker)
                return;
            if (sourceId) {
                await worker.fetchSource(sourceId);
            }
            else {
                await worker.fetchAll();
            }
        },
        isRunning: () => worker?.getIsRunning() ?? false,
        getCacheStats: () => {
            const cache = getDataLayerCache({ debug: config.debug });
            return cache.getStats();
        },
    };
}
// ============================================================================
// Helper Functions
// ============================================================================
function createEmptyContext() {
    return {
        oura: null,
        spotify: null,
        financial: null,
        calendar: null,
        rescueTime: null,
        gmail: null,
        withings: null,
        biometricSummary: null,
        moodSummary: null,
        scheduleSummary: null,
        communicationSummary: null,
        lastUpdated: {
            oura: null,
            spotify: null,
            financial: null,
            calendar: null,
            rescueTime: null,
            gmail: null,
            withings: null,
        },
    };
}
async function defaultEpisodeHandler(episode) {
    // Default: just log the episode
    // In production, this would call Graphiti's add_episode
    if (config.debug) {
        console.log(`[DataLayerPlugin] Episode: ${episode.name}`);
        console.log(`  Content: ${episode.content}`);
        console.log(`  Pattern: ${episode.metadata.pattern ?? 'none'}`);
    }
}
function registerFetchers(w, credentials, useMocks) {
    // Determine whether to use mocks or real fetchers
    // Default to mocks if no credentials provided or useMocks is explicitly true
    const shouldUseMocks = useMocks ?? !credentials;
    if (config.debug) {
        console.log(`[DataLayerPlugin] Using ${shouldUseMocks ? 'mock' : 'real'} fetchers`);
    }
    // Oura (Priority 1 - Sleep affects everything)
    if (!shouldUseMocks && credentials?.oura) {
        w.registerFetcher('oura', makeOuraFetcher({
            accessToken: credentials.oura.accessToken,
            debug: config.debug,
        }));
    }
    else {
        w.registerFetcher('oura', makeMockOuraFetcher());
    }
    // Spotify (Priority 2 - Music reveals mood)
    if (!shouldUseMocks && credentials?.spotify) {
        w.registerFetcher('spotify', makeSpotifyFetcher({
            accessToken: credentials.spotify.accessToken,
            debug: config.debug,
        }));
    }
    else {
        w.registerFetcher('spotify', makeMockSpotifyFetcher());
    }
    // Calendar (Priority 3 - Custody schedule is high priority)
    if (!shouldUseMocks && credentials?.calendar) {
        w.registerFetcher('calendar', makeCalendarFetcher({
            accessToken: credentials.calendar.accessToken,
            calendarId: credentials.calendar.calendarId,
            custodyCalendarId: credentials.calendar.custodyCalendarId,
            debug: config.debug,
        }));
    }
    else {
        w.registerFetcher('calendar', makeMockCalendarFetcher());
    }
    // Gmail (Priority 4 - Communication context)
    if (!shouldUseMocks && credentials?.gmail) {
        w.registerFetcher('gmail', makeGmailFetcher({
            accessToken: credentials.gmail.accessToken,
            userId: credentials.gmail.userId,
            maxResults: credentials.gmail.maxResults,
            debug: config.debug,
        }));
    }
    else {
        w.registerFetcher('gmail', makeMockGmailFetcher());
    }
    // Withings (Priority 5 - Body composition awareness)
    if (!shouldUseMocks && credentials?.withings) {
        w.registerFetcher('withings', makeWithingsFetcher({
            accessToken: credentials.withings.accessToken,
            debug: config.debug,
        }));
    }
    else {
        w.registerFetcher('withings', makeMockWithingsFetcher());
    }
    // Financial (Priority 6 - General awareness, WEEKLY refresh)
    if (!shouldUseMocks && credentials?.plaid) {
        w.registerFetcher('financial', makePlaidFetcher({
            clientId: credentials.plaid.clientId,
            secret: credentials.plaid.secret,
            accessToken: credentials.plaid.accessToken,
            debug: config.debug,
        }));
    }
    else {
        w.registerFetcher('financial', makeMockPlaidFetcher());
    }
    // RescueTime (Priority 7 - Lower priority, disabled by default)
    if (!shouldUseMocks && credentials?.rescueTime) {
        w.registerFetcher('rescueTime', makeRescueTimeFetcher({
            apiKey: credentials.rescueTime.apiKey,
            debug: config.debug,
        }));
    }
    else {
        w.registerFetcher('rescueTime', makeMockRescueTimeFetcher());
    }
}
// ============================================================================
// Exports
// ============================================================================
export * from './types.js';
export { DataLayerWorker, makeDataLayerWorker } from './worker.js';
export { DataLayerCache, getDataLayerCache, resetDataLayerCache } from './cache.js';
// Export fetchers for direct use
export { makeOuraFetcher, makeMockOuraFetcher, makeSpotifyFetcher, makeMockSpotifyFetcher, makePlaidFetcher, makeMockPlaidFetcher, makeCalendarFetcher, makeMockCalendarFetcher, makeGmailFetcher, makeMockGmailFetcher, makeWithingsFetcher, makeMockWithingsFetcher, makeRescueTimeFetcher, makeMockRescueTimeFetcher, } from './fetchers/index.js';
