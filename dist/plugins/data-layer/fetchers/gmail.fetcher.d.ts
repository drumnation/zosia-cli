/**
 * Gmail Data Fetcher
 *
 * Priority: Medium - "Communication context for relationship awareness"
 *
 * Fetches recent emails and patterns from Gmail API.
 * Rate limit: Every 4 hours (via cache TTL)
 */
import type { GmailData } from '../types.js';
interface GmailFetcherConfig {
    accessToken: string;
    userId?: string;
    maxResults?: number;
    debug?: boolean;
}
/**
 * Create a Gmail data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeGmailFetcher({
 *   accessToken: await brainCreds.get('gmail_token'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Unread: ${data.unreadCount}, Important: ${data.importantCount}`);
 * ```
 */
export declare function makeGmailFetcher(config: GmailFetcherConfig): () => Promise<GmailData>;
/**
 * Create a mock Gmail fetcher for development/testing
 */
export declare function makeMockGmailFetcher(options?: {
    unreadCount?: number;
    importantCount?: number;
    emailVolume?: 'low' | 'normal' | 'high';
}): () => Promise<GmailData>;
export {};
//# sourceMappingURL=gmail.fetcher.d.ts.map