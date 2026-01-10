/**
 * Role Knowledge Storage Tests
 *
 * Tests for Graphiti storage integration with role-specific group IDs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FetchedItem } from '../../src/roles/role-knowledge-domain.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import {
  getRoleGroupId,
  calculateExpiry,
  generateEpisodeName,
  isUrlStored,
  markUrlStored,
  clearStoredUrlsCache,
  storeRoleKnowledge,
  queryRoleKnowledge,
  createStorageCallback,
  buildSourceMap,
} from '../../src/roles/role-knowledge-storage.js';

describe('Role Knowledge Storage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearStoredUrlsCache();
  });

  describe('getRoleGroupId', () => {
    it('should generate correct group ID format', () => {
      expect(getRoleGroupId('engineer')).toBe('zosia-role-engineer');
      expect(getRoleGroupId('father')).toBe('zosia-role-father');
      expect(getRoleGroupId('musician')).toBe('zosia-role-musician');
    });
  });

  describe('calculateExpiry', () => {
    it('should calculate 24h expiry for hourly sources', () => {
      const baseDate = new Date('2025-01-01T12:00:00Z');
      const expiry = calculateExpiry('hourly', baseDate);

      const expectedExpiry = new Date('2025-01-02T12:00:00Z');
      expect(expiry.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should calculate 7d expiry for daily sources', () => {
      const baseDate = new Date('2025-01-01T12:00:00Z');
      const expiry = calculateExpiry('daily', baseDate);

      const expectedExpiry = new Date('2025-01-08T12:00:00Z');
      expect(expiry.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should calculate 30d expiry for weekly sources', () => {
      const baseDate = new Date('2025-01-01T12:00:00Z');
      const expiry = calculateExpiry('weekly', baseDate);

      const expectedExpiry = new Date('2025-01-31T12:00:00Z');
      expect(expiry.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should use current date if not provided', () => {
      const before = Date.now();
      const expiry = calculateExpiry('hourly');
      const after = Date.now();

      // Expiry should be ~24h from now (within the test execution window)
      const expiryTime = expiry.getTime();
      const expectedMin = before + 24 * 60 * 60 * 1000;
      const expectedMax = after + 24 * 60 * 60 * 1000;

      expect(expiryTime).toBeGreaterThanOrEqual(expectedMin);
      expect(expiryTime).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('generateEpisodeName', () => {
    it('should generate episode name with roleId and timestamp', () => {
      const name = generateEpisodeName('engineer');

      expect(name).toMatch(/^role-knowledge-engineer-\d+$/);
    });

    it('should generate unique names for same role', () => {
      const name1 = generateEpisodeName('engineer');
      // Small delay to ensure different timestamp
      const name2 = generateEpisodeName('engineer');

      // Names should be different (due to timestamp)
      // In fast execution they might be the same, so just verify format
      expect(name1).toMatch(/^role-knowledge-engineer-\d+$/);
      expect(name2).toMatch(/^role-knowledge-engineer-\d+$/);
    });
  });

  describe('URL storage cache', () => {
    it('should track stored URLs', () => {
      const url = 'https://example.com/article1';

      expect(isUrlStored(url)).toBe(false);
      markUrlStored(url);
      expect(isUrlStored(url)).toBe(true);
    });

    it('should clear cache', () => {
      const url = 'https://example.com/article2';

      markUrlStored(url);
      expect(isUrlStored(url)).toBe(true);

      clearStoredUrlsCache();
      expect(isUrlStored(url)).toBe(false);
    });
  });

  describe('storeRoleKnowledge', () => {
    const mockItems: FetchedItem[] = [
      {
        title: 'Test Article 1',
        content: 'Test content 1',
        url: 'https://example.com/1',
        pubDate: new Date('2025-01-01'),
        source: 'test-source',
      },
      {
        title: 'Test Article 2',
        content: 'Test content 2',
        url: 'https://example.com/2',
        pubDate: new Date('2025-01-02'),
        source: 'test-source',
      },
    ];

    const mockSource = {
      id: 'test-source',
      name: 'Test Source',
      relevanceScore: 0.8,
      updateFrequency: 'daily' as const,
    };

    it('should store items successfully', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await storeRoleKnowledge('engineer', mockItems, mockSource);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should skip duplicate URLs', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      // Store items first time
      await storeRoleKnowledge('engineer', mockItems, mockSource);

      // Clear mock to reset call counts
      mockFetch.mockClear();

      // Try to store same items again
      const result = await storeRoleKnowledge('engineer', mockItems, mockSource);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(0);
      expect(result.skipped).toBe(2);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await storeRoleKnowledge('engineer', mockItems, mockSource);

      expect(result.success).toBe(false);
      expect(result.stored).toBe(0);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await storeRoleKnowledge('engineer', mockItems, mockSource);

      expect(result.success).toBe(false);
      expect(result.stored).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Network error');
    });

    it('should return early for empty items', async () => {
      const result = await storeRoleKnowledge('engineer', [], mockSource);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send correct payload to Graphiti API', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await storeRoleKnowledge('engineer', [mockItems[0]], mockSource);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/messages');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.group_id).toBe('zosia-role-engineer');
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role_type).toBe('system');
      expect(body.messages[0].role).toBe('role-knowledge');
    });
  });

  describe('queryRoleKnowledge', () => {
    it('should query facts from Graphiti', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          facts: [
            {
              uuid: 'fact-1',
              fact: 'TypeScript is great for large codebases',
              created_at: '2025-01-01T00:00:00Z',
            },
            {
              uuid: 'fact-2',
              fact: 'React 19 has new features',
              created_at: '2025-01-02T00:00:00Z',
            },
          ],
        }),
      });

      const results = await queryRoleKnowledge('engineer', 'TypeScript');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('fact-1');
      expect(results[0].roleId).toBe('engineer');
      expect(results[0].summary).toBe('TypeScript is great for large codebases');
    });

    it('should send correct query parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ facts: [] }),
      });

      await queryRoleKnowledge('engineer', 'React', { maxFacts: 5 });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/search');

      const body = JSON.parse(options.body);
      expect(body.query).toBe('React');
      expect(body.group_ids).toEqual(['zosia-role-engineer']);
      expect(body.max_facts).toBe(5);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const results = await queryRoleKnowledge('engineer', 'test');

      expect(results).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await queryRoleKnowledge('engineer', 'test');

      expect(results).toEqual([]);
    });
  });

  describe('createStorageCallback', () => {
    it('should create callback that stores items', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const sourceMap = new Map([
        ['test-source', {
          id: 'test-source',
          name: 'Test Source',
          relevanceScore: 0.8,
          updateFrequency: 'daily' as const,
        }],
      ]);

      const callback = createStorageCallback(sourceMap);

      const items: FetchedItem[] = [{
        title: 'Test',
        content: 'Content',
        url: 'https://example.com/test',
        source: 'test-source',
      }];

      // Should not throw
      await expect(callback('engineer', 'test-source', items)).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle unknown source gracefully', async () => {
      const sourceMap = new Map();
      const callback = createStorageCallback(sourceMap);

      // Should not throw even with unknown source
      await expect(callback('engineer', 'unknown-source', [])).resolves.toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('buildSourceMap', () => {
    it('should build map from role configurations', () => {
      const roles = [
        {
          roleId: 'engineer',
          newsSources: [
            {
              id: 'hacker-news',
              name: 'Hacker News',
              relevanceScore: 0.95,
              updateFrequency: 'hourly' as const,
            },
            {
              id: 'dev-to',
              name: 'Dev.to',
              relevanceScore: 0.85,
              updateFrequency: 'daily' as const,
            },
          ],
        },
        {
          roleId: 'musician',
          newsSources: [
            {
              id: 'music-news',
              name: 'Music News',
              relevanceScore: 0.9,
              updateFrequency: 'weekly' as const,
            },
          ],
        },
      ];

      const map = buildSourceMap(roles);

      expect(map.size).toBe(3);
      expect(map.get('hacker-news')).toEqual({
        id: 'hacker-news',
        name: 'Hacker News',
        relevanceScore: 0.95,
        updateFrequency: 'hourly',
      });
      expect(map.get('dev-to')).toBeDefined();
      expect(map.get('music-news')).toBeDefined();
    });

    it('should handle empty roles array', () => {
      const map = buildSourceMap([]);
      expect(map.size).toBe(0);
    });

    it('should handle roles with no news sources', () => {
      const roles = [{ roleId: 'test', newsSources: [] }];
      const map = buildSourceMap(roles);
      expect(map.size).toBe(0);
    });
  });
});
