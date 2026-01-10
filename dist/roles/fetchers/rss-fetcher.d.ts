/**
 * RSS Feed Fetcher
 *
 * Fetches and parses RSS/Atom feeds for role knowledge gathering.
 * Supports content truncation, date parsing, and error handling.
 */
import type { NewsSource, FetchedItem } from '../role-knowledge-domain.js';
/**
 * Fetches items from an RSS or Atom feed.
 *
 * @param source - The news source configuration
 * @returns Array of fetched items
 * @throws Error if feed cannot be fetched or parsed
 */
export declare function fetchRss(source: NewsSource): Promise<FetchedItem[]>;
/**
 * RssFetcher class for object-oriented usage pattern.
 * Wraps the functional fetchRss for consistency with other fetchers.
 */
export declare class RssFetcher {
    /**
     * Fetch items from an RSS source.
     */
    fetch(source: NewsSource): Promise<FetchedItem[]>;
    /**
     * Test if a URL is a valid RSS feed.
     */
    testFeed(url: string): Promise<boolean>;
}
//# sourceMappingURL=rss-fetcher.d.ts.map