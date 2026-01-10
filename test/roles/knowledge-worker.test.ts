/**
 * Knowledge Worker Tests
 *
 * Tests for the background knowledge fetching worker.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RoleKnowledgeDomain, FetchedItem } from '../../src/roles/role-knowledge-domain.js';

// Hoist the mock variables
const { mockScheduledTask, mockFetchRss, mockValidate, mockSchedule } = vi.hoisted(() => ({
  mockScheduledTask: { stop: vi.fn() },
  mockFetchRss: vi.fn(),
  mockValidate: vi.fn(() => true),
  mockSchedule: vi.fn(),
}));

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    validate: mockValidate,
    schedule: mockSchedule.mockImplementation(() => mockScheduledTask),
  },
}));

// Mock the RSS fetcher
vi.mock('../../src/roles/fetchers/rss-fetcher.js', () => ({
  fetchRss: mockFetchRss,
}));

// Now import after mocks are set up
import {
  KnowledgeWorker,
  makeKnowledgeWorker,
  DEFAULT_WORKER_CONFIG,
} from '../../src/roles/knowledge-worker.js';

const mockRole: RoleKnowledgeDomain = {
  roleId: 'test-role',
  displayName: 'Test Role',
  description: 'A test role',
  keywords: ['test'],
  contextMarkers: ['testing'],
  newsSources: [
    {
      id: 'hourly-source',
      name: 'Hourly Source',
      type: 'rss',
      url: 'https://example.com/hourly',
      updateFrequency: 'hourly',
      relevanceScore: 0.8,
    },
    {
      id: 'daily-source',
      name: 'Daily Source',
      type: 'rss',
      url: 'https://example.com/daily',
      updateFrequency: 'daily',
      relevanceScore: 0.9,
    },
    {
      id: 'weekly-source',
      name: 'Weekly Source',
      type: 'rss',
      url: 'https://example.com/weekly',
      updateFrequency: 'weekly',
      relevanceScore: 0.7,
    },
  ],
  researchTopics: [],
  communities: [],
  transitionIndicators: [],
  emergingKeywords: [],
  totalEpisodesStored: 0,
};

const mockItems: FetchedItem[] = [
  {
    title: 'Test Article',
    content: 'Test content',
    url: 'https://example.com/article',
    pubDate: new Date(),
    source: 'test-source',
  },
];

describe('KnowledgeWorker', () => {
  let mockOnFetch: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnFetch = vi.fn().mockResolvedValue(undefined);
    mockOnError = vi.fn();
    mockFetchRss.mockReset();
    mockFetchRss.mockResolvedValue(mockItems);
    mockSchedule.mockReset();
    mockSchedule.mockImplementation(() => mockScheduledTask);
    mockValidate.mockReset();
    mockValidate.mockReturnValue(true);
    mockScheduledTask.stop.mockReset();
  });

  describe('constructor', () => {
    it('should create worker with default config', () => {
      const worker = new KnowledgeWorker({
        roles: [mockRole],
        onFetch: mockOnFetch,
      });

      expect(worker).toBeDefined();
      expect(worker.getIsRunning()).toBe(false);
    });

    it('should merge partial config with defaults', () => {
      const worker = new KnowledgeWorker({
        roles: [mockRole],
        config: { runOnStartup: true },
        onFetch: mockOnFetch,
      });

      expect(worker).toBeDefined();
    });
  });

  describe('start()', () => {
    it('should not start if disabled', async () => {
      const worker = new KnowledgeWorker({
        roles: [mockRole],
        config: { enabled: false },
        onFetch: mockOnFetch,
      });

      await worker.start();

      expect(worker.getIsRunning()).toBe(false);
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('should schedule jobs when started', async () => {
      const worker = new KnowledgeWorker({
        roles: [mockRole],
        onFetch: mockOnFetch,
      });

      await worker.start();

      expect(worker.getIsRunning()).toBe(true);
      // Should schedule 3 jobs (hourly, daily, weekly)
      expect(mockSchedule).toHaveBeenCalledTimes(3);
    });

    it('should not start twice', async () => {
      const worker = new KnowledgeWorker({
        roles: [mockRole],
        onFetch: mockOnFetch,
      });

      await worker.start();
      mockSchedule.mockClear(); // Clear the schedule calls
      await worker.start(); // Second call

      // Should not schedule more jobs
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should stop scheduled jobs', async () => {
      const worker = new KnowledgeWorker({
        roles: [mockRole],
        onFetch: mockOnFetch,
      });

      await worker.start();
      expect(worker.getIsRunning()).toBe(true);

      worker.stop();
      expect(worker.getIsRunning()).toBe(false);
      expect(mockScheduledTask.stop).toHaveBeenCalled();
    });

    it('should do nothing if not running', () => {
      const worker = new KnowledgeWorker({
        roles: [mockRole],
        onFetch: mockOnFetch,
      });

      // Should not throw
      expect(() => worker.stop()).not.toThrow();
    });
  });

  describe('fetchSourcesByFrequency()', () => {
    it('should only fetch sources matching frequency', async () => {
      const worker = new KnowledgeWorker({
        roles: [mockRole],
        onFetch: mockOnFetch,
      });

      await worker.fetchSourcesByFrequency('daily');

      // Should only call fetchRss once (for daily source)
      expect(mockFetchRss).toHaveBeenCalledTimes(1);
      // Should call onFetch once
      expect(mockOnFetch).toHaveBeenCalledTimes(1);
      expect(mockOnFetch).toHaveBeenCalledWith(
        'test-role',
        'daily-source',
        mockItems
      );
    });

    it('should fetch all sources for that frequency across roles', async () => {
      const secondRole: RoleKnowledgeDomain = {
        ...mockRole,
        roleId: 'second-role',
        newsSources: [
          {
            id: 'second-daily',
            name: 'Second Daily',
            type: 'rss',
            url: 'https://example.com/second-daily',
            updateFrequency: 'daily',
            relevanceScore: 0.8,
          },
        ],
      };

      const worker = new KnowledgeWorker({
        roles: [mockRole, secondRole],
        onFetch: mockOnFetch,
      });

      await worker.fetchSourcesByFrequency('daily');

      // Should call fetchRss twice (once for each role's daily source)
      expect(mockFetchRss).toHaveBeenCalledTimes(2);
      expect(mockOnFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should call error handler on fetch failure', async () => {
      mockFetchRss.mockRejectedValueOnce(new Error('Network error'));

      const worker = new KnowledgeWorker({
        roles: [mockRole],
        onFetch: mockOnFetch,
        onError: mockOnError,
      });

      await worker.fetchSourcesByFrequency('daily');

      expect(mockOnError).toHaveBeenCalledTimes(1);
      expect(mockOnError).toHaveBeenCalledWith(
        'test-role',
        'daily-source',
        expect.any(Error)
      );
      // onFetch should not be called
      expect(mockOnFetch).not.toHaveBeenCalled();
    });

    it('should continue to next source after error', async () => {
      // First call fails, second succeeds
      mockFetchRss
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockItems);

      const roleWithTwoDailySources: RoleKnowledgeDomain = {
        ...mockRole,
        newsSources: [
          {
            id: 'failing-source',
            name: 'Failing Source',
            type: 'rss',
            url: 'https://example.com/fail',
            updateFrequency: 'daily',
            relevanceScore: 0.8,
          },
          {
            id: 'working-source',
            name: 'Working Source',
            type: 'rss',
            url: 'https://example.com/work',
            updateFrequency: 'daily',
            relevanceScore: 0.8,
          },
        ],
      };

      const worker = new KnowledgeWorker({
        roles: [roleWithTwoDailySources],
        onFetch: mockOnFetch,
        onError: mockOnError,
      });

      await worker.fetchSourcesByFrequency('daily');

      // Error called once for first source
      expect(mockOnError).toHaveBeenCalledTimes(1);
      // onFetch called once for second source
      expect(mockOnFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('makeKnowledgeWorker factory', () => {
    it('should create a KnowledgeWorker instance', () => {
      const worker = makeKnowledgeWorker({
        roles: [mockRole],
        onFetch: mockOnFetch,
      });

      expect(worker).toBeInstanceOf(KnowledgeWorker);
    });
  });

  describe('DEFAULT_WORKER_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_WORKER_CONFIG.enabled).toBe(true);
      expect(DEFAULT_WORKER_CONFIG.runOnStartup).toBe(false);
      expect(DEFAULT_WORKER_CONFIG.hourlySchedule).toBe('0 * * * *');
      expect(DEFAULT_WORKER_CONFIG.dailySchedule).toBe('0 6 * * *');
      expect(DEFAULT_WORKER_CONFIG.weeklySchedule).toBe('0 6 * * 0');
    });
  });
});
