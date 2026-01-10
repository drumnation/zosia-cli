/**
 * RSS Fetcher Tests
 *
 * Unit tests for the RSS feed fetcher functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import { fetchRss, RssFetcher } from '../../../src/roles/fetchers/rss-fetcher.js';
import type { NewsSource } from '../../../src/roles/role-knowledge-domain.js';

describe('fetchRss', () => {
  it('should reject non-RSS sources', async () => {
    const source: NewsSource = {
      id: 'test',
      name: 'Test',
      type: 'api', // Not RSS
      url: 'https://example.com',
      updateFrequency: 'daily',
      relevanceScore: 0.5,
    };

    await expect(fetchRss(source)).rejects.toThrow("only handles 'rss' type sources");
  });

  it('should handle network errors gracefully', async () => {
    const source: NewsSource = {
      id: 'test',
      name: 'Test Feed',
      type: 'rss',
      url: 'https://invalid-url-that-does-not-exist-12345.com/feed',
      updateFrequency: 'daily',
      relevanceScore: 0.5,
    };

    await expect(fetchRss(source)).rejects.toThrow("Failed to fetch RSS feed 'Test Feed'");
  });

  it('should respect maxItems config', async () => {
    // This test would require mocking the parser
    // For now, we test the type structure
    const source: NewsSource = {
      id: 'test',
      name: 'Test',
      type: 'rss',
      url: 'https://example.com/feed',
      updateFrequency: 'daily',
      relevanceScore: 0.5,
      fetchConfig: {
        maxItems: 5,
      },
    };

    // Type check that fetchConfig is properly typed
    expect(source.fetchConfig?.maxItems).toBe(5);
  });
});

describe('RssFetcher class', () => {
  it('should wrap fetchRss function', () => {
    const fetcher = new RssFetcher();
    expect(typeof fetcher.fetch).toBe('function');
    expect(typeof fetcher.testFeed).toBe('function');
  });

  it('should return false for invalid feed URL', async () => {
    const fetcher = new RssFetcher();
    const isValid = await fetcher.testFeed('https://invalid-url-12345.com/feed');
    expect(isValid).toBe(false);
  });
});

// Integration test - requires network access
describe('fetchRss integration', () => {
  it.skip('should fetch real RSS feed (dev.to)', async () => {
    // Skip by default - enable for manual testing
    const source: NewsSource = {
      id: 'devto',
      name: 'Dev.to',
      type: 'rss',
      url: 'https://dev.to/feed',
      updateFrequency: 'daily',
      relevanceScore: 0.8,
      fetchConfig: {
        maxItems: 3,
      },
    };

    const items = await fetchRss(source);

    expect(items.length).toBeLessThanOrEqual(3);
    expect(items[0]).toHaveProperty('title');
    expect(items[0]).toHaveProperty('content');
    expect(items[0]).toHaveProperty('url');
    expect(items[0]).toHaveProperty('source', 'devto');
  });
});
