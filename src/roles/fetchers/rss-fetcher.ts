/**
 * RSS Feed Fetcher
 *
 * Fetches and parses RSS/Atom feeds for role knowledge gathering.
 * Supports content truncation, date parsing, and error handling.
 */

import Parser from 'rss-parser';
import type { NewsSource, FetchedItem } from '../role-knowledge-domain.js';

/** Maximum content length before truncation */
const MAX_CONTENT_LENGTH = 2000;

/** RSS Parser instance with custom fields */
const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
    ],
  },
  timeout: 10000, // 10 second timeout
});

/**
 * Fetches items from an RSS or Atom feed.
 *
 * @param source - The news source configuration
 * @returns Array of fetched items
 * @throws Error if feed cannot be fetched or parsed
 */
export async function fetchRss(source: NewsSource): Promise<FetchedItem[]> {
  if (source.type !== 'rss') {
    throw new Error(`RssFetcher only handles 'rss' type sources, got '${source.type}'`);
  }

  try {
    const feed = await parser.parseURL(source.url);

    const maxItems = source.fetchConfig?.maxItems ?? 20;

    return feed.items.slice(0, maxItems).map((item) => ({
      title: item.title ?? '(No title)',
      content: truncateContent(
        item.contentSnippet ?? item.contentEncoded ?? item.content ?? item.summary ?? ''
      ),
      url: item.link ?? '',
      pubDate: parseDate(item.pubDate ?? item.isoDate),
      source: source.id,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch RSS feed '${source.name}' (${source.id}): ${message}`);
  }
}

/**
 * Truncates content to maximum length with ellipsis.
 */
function truncateContent(content: string): string {
  // Clean up HTML entities and whitespace
  const cleaned = content
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= MAX_CONTENT_LENGTH) {
    return cleaned;
  }

  return cleaned.slice(0, MAX_CONTENT_LENGTH - 3) + '...';
}

/**
 * Parses various date formats into Date object.
 * Returns undefined for invalid dates instead of throwing.
 */
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;

  try {
    const date = new Date(dateStr);
    // Check if valid date
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date;
  } catch {
    return undefined;
  }
}

/**
 * RssFetcher class for object-oriented usage pattern.
 * Wraps the functional fetchRss for consistency with other fetchers.
 */
export class RssFetcher {
  /**
   * Fetch items from an RSS source.
   */
  async fetch(source: NewsSource): Promise<FetchedItem[]> {
    return fetchRss(source);
  }

  /**
   * Test if a URL is a valid RSS feed.
   */
  async testFeed(url: string): Promise<boolean> {
    try {
      await parser.parseURL(url);
      return true;
    } catch {
      return false;
    }
  }
}
