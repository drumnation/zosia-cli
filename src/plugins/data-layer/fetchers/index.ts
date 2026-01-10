/**
 * Data Layer Fetchers Index
 *
 * Exports all fetchers and mock implementations for the DATA LAYER plugin.
 *
 * Priority order (from design doc):
 * 1. Oura Ring - Sleep affects everything (HOURLY)
 * 2. Spotify - Music reveals mood (HOURLY)
 * 3. Calendar - Custody schedule is high priority (HOURLY)
 * 4. Gmail - Communication context (FOUR-HOURLY)
 * 5. Withings - Body composition awareness (DAILY)
 * 6. Financial - General awareness (WEEKLY only)
 * 7. RescueTime - Lower priority, disabled by default (HOURLY when enabled)
 */

// Real fetchers (require API credentials)
export { makeOuraFetcher, makeMockOuraFetcher } from './oura.fetcher.js';
export { makeSpotifyFetcher, makeMockSpotifyFetcher } from './spotify.fetcher.js';
export { makePlaidFetcher, makeMockPlaidFetcher } from './plaid.fetcher.js';
export { makeCalendarFetcher, makeMockCalendarFetcher } from './calendar.fetcher.js';
export { makeGmailFetcher, makeMockGmailFetcher } from './gmail.fetcher.js';
export { makeWithingsFetcher, makeMockWithingsFetcher } from './withings.fetcher.js';
export { makeRescueTimeFetcher, makeMockRescueTimeFetcher } from './rescuetime.fetcher.js';

// Re-export types for convenience
export type {
  OuraData,
  SpotifyData,
  FinancialData,
  CalendarData,
  GmailData,
  WithingsData,
  RescueTimeData,
} from '../types.js';
