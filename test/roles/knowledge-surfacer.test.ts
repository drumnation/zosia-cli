/**
 * Knowledge Surfacer Tests
 *
 * Tests for surfacing role knowledge when roles are detected.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import {
  surfaceKnowledgeForRoles,
  toRoleKnowledgeState,
  generateRoleIntelligencePrompt,
  surfaceAndGeneratePrompt,
  type DetectedRole,
} from '../../src/roles/knowledge-surfacer.js';

describe('Knowledge Surfacer', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('surfaceKnowledgeForRoles', () => {
    it('should filter roles by confidence threshold (AC3)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ facts: [] }),
      });

      const detectedRoles: DetectedRole[] = [
        { roleId: 'engineer', confidence: 0.8 },  // Above threshold
        { roleId: 'father', confidence: 0.3 },    // Below threshold
        { roleId: 'musician', confidence: 0.6 },  // Above threshold
      ];

      await surfaceKnowledgeForRoles(detectedRoles);

      // Should only query engineer and musician (2 calls)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use custom confidence threshold', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ facts: [] }),
      });

      const detectedRoles: DetectedRole[] = [
        { roleId: 'engineer', confidence: 0.8 },
        { roleId: 'father', confidence: 0.7 },
      ];

      await surfaceKnowledgeForRoles(detectedRoles, {
        confidenceThreshold: 0.75,
      });

      // Only engineer should be queried (confidence >= 0.75)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should query all qualifying roles in parallel (AC2)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          facts: [
            {
              uuid: 'fact-1',
              fact: 'Test insight',
              created_at: new Date().toISOString(),
              source_description: 'test-source',
            },
          ],
        }),
      });

      const detectedRoles: DetectedRole[] = [
        { roleId: 'engineer', confidence: 0.8 },
        { roleId: 'father', confidence: 0.7 },
      ];

      const results = await surfaceKnowledgeForRoles(detectedRoles);

      expect(results).toHaveLength(2);
      expect(results[0].roleId).toBe('engineer');
      expect(results[1].roleId).toBe('father');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no roles qualify', async () => {
      const detectedRoles: DetectedRole[] = [
        { roleId: 'engineer', confidence: 0.2 },
        { roleId: 'father', confidence: 0.1 },
      ];

      const results = await surfaceKnowledgeForRoles(detectedRoles);

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should transform facts to insights with age (AC1)', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          facts: [
            {
              uuid: 'fact-1',
              fact: 'TypeScript monorepo tooling discussion',
              created_at: twoHoursAgo.toISOString(),
              source_description: 'hacker-news',
            },
          ],
        }),
      });

      const results = await surfaceKnowledgeForRoles([
        { roleId: 'engineer', confidence: 0.8 },
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].insights).toHaveLength(1);
      expect(results[0].insights[0].summary).toBe('TypeScript monorepo tooling discussion');
      expect(results[0].insights[0].source).toBe('hacker-news');
      expect(results[0].insights[0].age).toBe('2 hours ago');
    });

    it('should handle API errors gracefully (AC7)', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const results = await surfaceKnowledgeForRoles([
        { roleId: 'engineer', confidence: 0.8 },
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].insights).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await surfaceKnowledgeForRoles([
        { roleId: 'engineer', confidence: 0.8 },
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].insights).toEqual([]);
    });

    it('should respect maxInsightsPerRole option', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ facts: [] }),
      });

      await surfaceKnowledgeForRoles(
        [{ roleId: 'engineer', confidence: 0.8 }],
        { maxInsightsPerRole: 10 }
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.max_facts).toBe(10);
    });
  });

  describe('toRoleKnowledgeState', () => {
    it('should convert to MindState format (AC4)', () => {
      const surfacedKnowledge = [
        {
          roleId: 'engineer',
          insights: [
            { summary: 'Insight 1', source: 'hn', relevance: 0.9, age: '2 hours ago' },
            { summary: 'Insight 2', source: 'dev', relevance: 0.8, age: '5 hours ago' },
          ],
        },
      ];

      const result = toRoleKnowledgeState(surfacedKnowledge);

      expect(result.engineer).toBeDefined();
      expect(result.engineer.insights).toEqual(['Insight 1', 'Insight 2']);
      expect(result.engineer.freshness).toBe('recent');
    });

    it('should calculate freshness as "recent" when < 24h (AC5)', () => {
      const surfacedKnowledge = [
        {
          roleId: 'engineer',
          insights: [
            { summary: 'Fresh insight', source: 'hn', relevance: 0.9, age: '2 hours ago' },
          ],
        },
      ];

      const result = toRoleKnowledgeState(surfacedKnowledge);
      expect(result.engineer.freshness).toBe('recent');
    });

    it('should calculate freshness as "stale" when > 24h but < 7d (AC5)', () => {
      const surfacedKnowledge = [
        {
          roleId: 'engineer',
          insights: [
            { summary: 'Stale insight', source: 'hn', relevance: 0.9, age: '3 days ago' },
          ],
        },
      ];

      const result = toRoleKnowledgeState(surfacedKnowledge);
      expect(result.engineer.freshness).toBe('stale');
    });

    it('should calculate freshness as "none" when no insights', () => {
      const surfacedKnowledge = [
        {
          roleId: 'engineer',
          insights: [],
        },
      ];

      const result = toRoleKnowledgeState(surfacedKnowledge);
      expect(result.engineer.freshness).toBe('none');
    });

    it('should handle multiple roles', () => {
      const surfacedKnowledge = [
        {
          roleId: 'engineer',
          insights: [
            { summary: 'Tech insight', source: 'hn', relevance: 0.9, age: '1 hour ago' },
          ],
        },
        {
          roleId: 'father',
          insights: [
            { summary: 'Parenting insight', source: 'blog', relevance: 0.8, age: 'yesterday' },
          ],
        },
      ];

      const result = toRoleKnowledgeState(surfacedKnowledge);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result.engineer.freshness).toBe('recent');
      expect(result.father.freshness).toBe('stale');
    });
  });

  describe('generateRoleIntelligencePrompt', () => {
    it('should generate formatted prompt section (AC6)', () => {
      const roleKnowledge = {
        engineer: {
          insights: ['AI agent frameworks are shifting', 'TypeScript monorepo discussion'],
          freshness: 'recent' as const,
        },
      };

      const prompt = generateRoleIntelligencePrompt(roleKnowledge);

      expect(prompt).toContain('## Current Role Intelligence');
      expect(prompt).toContain('### Engineer');
      expect(prompt).toContain('Recent insights (fresh)');
      expect(prompt).toContain('- "AI agent frameworks are shifting"');
      expect(prompt).toContain('- "TypeScript monorepo discussion"');
    });

    it('should indicate stale freshness', () => {
      const roleKnowledge = {
        father: {
          insights: ['Pre-teen developmental milestones'],
          freshness: 'stale' as const,
        },
      };

      const prompt = generateRoleIntelligencePrompt(roleKnowledge);

      expect(prompt).toContain('### Father');
      expect(prompt).toContain('stale - older than 24 hours');
    });

    it('should handle no insights gracefully (AC7)', () => {
      const roleKnowledge = {
        musician: {
          insights: [],
          freshness: 'none' as const,
        },
      };

      const prompt = generateRoleIntelligencePrompt(roleKnowledge);

      expect(prompt).toContain('### Musician');
      expect(prompt).toContain('No recent intelligence gathered');
    });

    it('should handle multiple roles', () => {
      const roleKnowledge = {
        engineer: {
          insights: ['Tech insight'],
          freshness: 'recent' as const,
        },
        father: {
          insights: ['Parenting insight'],
          freshness: 'stale' as const,
        },
      };

      const prompt = generateRoleIntelligencePrompt(roleKnowledge);

      expect(prompt).toContain('### Engineer');
      expect(prompt).toContain('### Father');
    });

    it('should return empty string when no roles', () => {
      const prompt = generateRoleIntelligencePrompt({});
      expect(prompt).toBe('');
    });
  });

  describe('surfaceAndGeneratePrompt', () => {
    it('should combine surfacing and prompt generation', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          facts: [
            {
              uuid: 'fact-1',
              fact: 'TypeScript is awesome',
              created_at: twoHoursAgo.toISOString(),
              source_description: 'hn',
            },
          ],
        }),
      });

      const result = await surfaceAndGeneratePrompt([
        { roleId: 'engineer', confidence: 0.8 },
      ]);

      expect(result.roleKnowledge.engineer).toBeDefined();
      expect(result.roleKnowledge.engineer.insights).toContain('TypeScript is awesome');
      expect(result.roleKnowledge.engineer.freshness).toBe('recent');
      expect(result.promptSection).toContain('### Engineer');
      expect(result.promptSection).toContain('TypeScript is awesome');
    });

    it('should handle no qualifying roles', async () => {
      const result = await surfaceAndGeneratePrompt([
        { roleId: 'engineer', confidence: 0.2 },
      ]);

      expect(result.roleKnowledge).toEqual({});
      expect(result.promptSection).toBe('');
    });
  });

  describe('age calculation', () => {
    it('should format "just now" for very recent', async () => {
      const justNow = new Date();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          facts: [
            {
              uuid: 'fact-1',
              fact: 'Recent fact',
              created_at: justNow.toISOString(),
            },
          ],
        }),
      });

      const results = await surfaceKnowledgeForRoles([
        { roleId: 'engineer', confidence: 0.8 },
      ]);

      expect(results[0].insights[0].age).toBe('just now');
    });

    it('should format "1 hour ago" correctly', async () => {
      const oneHourAgo = new Date(Date.now() - 1.5 * 60 * 60 * 1000);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          facts: [
            {
              uuid: 'fact-1',
              fact: 'Hour old fact',
              created_at: oneHourAgo.toISOString(),
            },
          ],
        }),
      });

      const results = await surfaceKnowledgeForRoles([
        { roleId: 'engineer', confidence: 0.8 },
      ]);

      expect(results[0].insights[0].age).toBe('1 hour ago');
    });

    it('should format "yesterday" correctly', async () => {
      const yesterday = new Date(Date.now() - 30 * 60 * 60 * 1000);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          facts: [
            {
              uuid: 'fact-1',
              fact: 'Yesterday fact',
              created_at: yesterday.toISOString(),
            },
          ],
        }),
      });

      const results = await surfaceKnowledgeForRoles([
        { roleId: 'engineer', confidence: 0.8 },
      ]);

      expect(results[0].insights[0].age).toBe('yesterday');
    });

    it('should format "X days ago" correctly', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          facts: [
            {
              uuid: 'fact-1',
              fact: 'Old fact',
              created_at: threeDaysAgo.toISOString(),
            },
          ],
        }),
      });

      const results = await surfaceKnowledgeForRoles([
        { roleId: 'engineer', confidence: 0.8 },
      ]);

      expect(results[0].insights[0].age).toBe('3 days ago');
    });
  });
});
