/**
 * Context Window Indicator Tests - TDD
 *
 * Tests for tracking and displaying context window usage.
 * Contract: Uses OpenRouter model.context_length (mapped to contextLength)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createContextTracker,
  formatContextUsage,
  getContextPercentage,
  type ContextTracker,
  type ContextUsage,
} from '../src/context-window.js';

describe('Context Window Indicator', () => {
  describe('createContextTracker()', () => {
    let tracker: ContextTracker;

    beforeEach(() => {
      // Default context length from OpenRouter (e.g., gemma-2-9b-it = 8192)
      tracker = createContextTracker({ contextLength: 8192 });
    });

    describe('initial state', () => {
      it('should start with zero usage', () => {
        const usage = tracker.getUsage();

        expect(usage.usedTokens).toBe(0);
        expect(usage.contextLength).toBe(8192);
        expect(usage.percentUsed).toBe(0);
      });

      it('should use provided context length', () => {
        const largeTracker = createContextTracker({ contextLength: 200000 });
        expect(largeTracker.getUsage().contextLength).toBe(200000);
      });
    });

    describe('addTokens()', () => {
      it('should add prompt tokens to usage', () => {
        tracker.addTokens({ promptTokens: 100, completionTokens: 0 });

        const usage = tracker.getUsage();
        expect(usage.usedTokens).toBe(100);
      });

      it('should add completion tokens to usage', () => {
        tracker.addTokens({ promptTokens: 0, completionTokens: 200 });

        const usage = tracker.getUsage();
        expect(usage.usedTokens).toBe(200);
      });

      it('should accumulate tokens across calls', () => {
        tracker.addTokens({ promptTokens: 100, completionTokens: 50 });
        tracker.addTokens({ promptTokens: 200, completionTokens: 100 });
        tracker.addTokens({ promptTokens: 150, completionTokens: 75 });

        const usage = tracker.getUsage();
        // 100+200+150 = 450 prompt, 50+100+75 = 225 completion
        expect(usage.usedTokens).toBe(675);
      });

      it('should calculate percentage correctly', () => {
        tracker.addTokens({ promptTokens: 4096, completionTokens: 0 });

        const usage = tracker.getUsage();
        expect(usage.percentUsed).toBe(50); // 4096/8192 = 50%
      });
    });

    describe('setContextLength()', () => {
      it('should update context length (model change)', () => {
        // Simulate switching to Claude (200K context)
        tracker.setContextLength(200000);

        const usage = tracker.getUsage();
        expect(usage.contextLength).toBe(200000);
      });

      it('should recalculate percentage after model change', () => {
        tracker.addTokens({ promptTokens: 4096, completionTokens: 0 });
        expect(tracker.getUsage().percentUsed).toBe(50);

        // Switch to larger context
        tracker.setContextLength(16384);
        expect(tracker.getUsage().percentUsed).toBe(25); // 4096/16384 = 25%
      });
    });

    describe('reset()', () => {
      it('should clear token usage but keep context length', () => {
        tracker.addTokens({ promptTokens: 1000, completionTokens: 500 });
        tracker.reset();

        const usage = tracker.getUsage();
        expect(usage.usedTokens).toBe(0);
        expect(usage.contextLength).toBe(8192);
      });
    });

    describe('getWarningLevel()', () => {
      it('should return "low" for under 50% usage', () => {
        tracker.addTokens({ promptTokens: 3000, completionTokens: 0 });
        expect(tracker.getWarningLevel()).toBe('low');
      });

      it('should return "medium" for 50-75% usage', () => {
        tracker.addTokens({ promptTokens: 5000, completionTokens: 0 });
        expect(tracker.getWarningLevel()).toBe('medium');
      });

      it('should return "high" for 75-90% usage', () => {
        tracker.addTokens({ promptTokens: 7000, completionTokens: 0 });
        expect(tracker.getWarningLevel()).toBe('high');
      });

      it('should return "critical" for over 90% usage', () => {
        tracker.addTokens({ promptTokens: 7500, completionTokens: 0 });
        expect(tracker.getWarningLevel()).toBe('critical');
      });
    });
  });

  describe('formatContextUsage()', () => {
    it('should format small usage compactly', () => {
      const result = formatContextUsage({
        usedTokens: 500,
        contextLength: 8192,
        percentUsed: 6,
      });

      expect(result).toContain('500');
      expect(result).toContain('8.2K');
      expect(result).toContain('6%');
    });

    it('should format large usage with K suffix', () => {
      const result = formatContextUsage({
        usedTokens: 150000,
        contextLength: 200000,
        percentUsed: 75,
      });

      // formatTokenCount uses 1 decimal place, so expect 150.0K
      expect(result).toMatch(/150(\.0)?K/);
      expect(result).toMatch(/200(\.0)?K/);
      expect(result).toContain('75%');
    });

    it('should include visual bar', () => {
      const result = formatContextUsage({
        usedTokens: 4096,
        contextLength: 8192,
        percentUsed: 50,
      });

      // Should have some visual representation
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('getContextPercentage()', () => {
    it('should calculate percentage from raw values', () => {
      expect(getContextPercentage(1000, 10000)).toBe(10);
      expect(getContextPercentage(5000, 10000)).toBe(50);
      expect(getContextPercentage(9500, 10000)).toBe(95);
    });

    it('should handle zero context length', () => {
      expect(getContextPercentage(1000, 0)).toBe(0);
    });

    it('should cap at 100%', () => {
      expect(getContextPercentage(15000, 10000)).toBe(100);
    });

    it('should round to integer', () => {
      expect(getContextPercentage(333, 1000)).toBe(33);
      expect(getContextPercentage(666, 1000)).toBe(67);
    });
  });

  describe('integration with real model data', () => {
    it('should work with typical OpenRouter context lengths', () => {
      // Real values from OpenRouter API
      const models = [
        { name: 'gemma-2-9b-it', contextLength: 8192 },
        { name: 'claude-3-haiku', contextLength: 200000 },
        { name: 'gpt-4-turbo', contextLength: 128000 },
        { name: 'mistral-7b', contextLength: 32768 },
      ];

      for (const model of models) {
        const tracker = createContextTracker({ contextLength: model.contextLength });
        tracker.addTokens({ promptTokens: 1000, completionTokens: 500 });

        const usage = tracker.getUsage();
        expect(usage.usedTokens).toBe(1500);
        expect(usage.contextLength).toBe(model.contextLength);
        expect(usage.percentUsed).toBeGreaterThan(0);
        expect(usage.percentUsed).toBeLessThanOrEqual(100);
      }
    });
  });
});
