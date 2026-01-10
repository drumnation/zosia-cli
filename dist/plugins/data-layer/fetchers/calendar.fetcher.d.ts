/**
 * Calendar Data Fetcher
 *
 * Priority 4: Custody schedule is HIGH priority (affects everything)
 *
 * Fetches today's events, upcoming events, and custody schedule from Google Calendar.
 * The custody detection is crucial for Zosia to understand Dave's context.
 * Rate limit: Hourly (via cache TTL)
 */
import type { CalendarData } from '../types.js';
interface CalendarFetcherConfig {
    accessToken: string;
    calendarId?: string;
    custodyCalendarId?: string;
    debug?: boolean;
}
/**
 * Create a Google Calendar data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeCalendarFetcher({
 *   accessToken: await brainCreds.get('google_calendar_token'),
 *   custodyCalendarId: 'custody_calendar_id',
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * if (data.custody.isWeekOn) {
 *   console.log('Kids are with Dave this week');
 * }
 * ```
 */
export declare function makeCalendarFetcher(config: CalendarFetcherConfig): () => Promise<CalendarData>;
/**
 * Create a mock Calendar fetcher for development/testing
 */
export declare function makeMockCalendarFetcher(options?: {
    isWeekOn?: boolean;
    daysUntilTransition?: number;
    busyLevel?: 'light' | 'moderate' | 'heavy';
}): () => Promise<CalendarData>;
export {};
//# sourceMappingURL=calendar.fetcher.d.ts.map