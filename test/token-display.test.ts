/**
 * Token/Cost Display Tests - TDD
 *
 * Tests for formatting and displaying token usage and costs.
 * These tests are written FIRST before implementation (RED phase).
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import the module we're going to build
import {
  formatTokenCount,
  formatCost,
  createTokenTracker,
  type TokenTracker,
  type TurnUsage,
  type SessionStats,
} from '../src/token-display.js';

describe('Token/Cost Display', () => {
  describe('formatTokenCount()', () => {
    it('should format small numbers without abbreviation', () => {
      expect(formatTokenCount(0)).toBe('0');
      expect(formatTokenCount(1)).toBe('1');
      expect(formatTokenCount(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      expect(formatTokenCount(1000)).toBe('1.0K');
      expect(formatTokenCount(1500)).toBe('1.5K');
      expect(formatTokenCount(10000)).toBe('10.0K');
      expect(formatTokenCount(99999)).toBe('100.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatTokenCount(1000000)).toBe('1.0M');
      expect(formatTokenCount(1500000)).toBe('1.5M');
      expect(formatTokenCount(10000000)).toBe('10.0M');
    });

    it('should handle edge cases', () => {
      expect(formatTokenCount(-1)).toBe('0');
      expect(formatTokenCount(NaN)).toBe('0');
    });

    it('should allow custom precision', () => {
      expect(formatTokenCount(1234, 0)).toBe('1K');
      expect(formatTokenCount(1234, 2)).toBe('1.23K');
    });
  });

  describe('formatCost()', () => {
    it('should format zero cost', () => {
      expect(formatCost(0)).toBe('$0.00');
    });

    it('should format small costs with high precision', () => {
      expect(formatCost(0.000001)).toBe('$0.000001');
      expect(formatCost(0.00001)).toBe('$0.00001');
      expect(formatCost(0.0001)).toBe('$0.0001');
    });

    it('should format cents with 2 decimal places', () => {
      expect(formatCost(0.01)).toBe('$0.01');
      expect(formatCost(0.99)).toBe('$0.99');
    });

    it('should format dollars normally', () => {
      expect(formatCost(1.00)).toBe('$1.00');
      expect(formatCost(10.50)).toBe('$10.50');
      expect(formatCost(100.00)).toBe('$100.00');
    });

    it('should handle very small values', () => {
      expect(formatCost(0.0000001)).toBe('<$0.000001');
    });

    it('should show "FREE" for exactly zero', () => {
      expect(formatCost(0, { showFree: true })).toBe('FREE');
    });
  });

  describe('createTokenTracker()', () => {
    let tracker: TokenTracker;

    beforeEach(() => {
      tracker = createTokenTracker();
    });

    describe('initial state', () => {
      it('should start with zero usage', () => {
        const stats = tracker.getSessionStats();

        expect(stats.totalPromptTokens).toBe(0);
        expect(stats.totalCompletionTokens).toBe(0);
        expect(stats.totalCost).toBe(0);
        expect(stats.turnCount).toBe(0);
      });

      it('should have empty current turn', () => {
        const current = tracker.getCurrentTurn();

        expect(current).toBeNull();
      });
    });

    describe('startTurn()', () => {
      it('should create a new turn', () => {
        tracker.startTurn();

        const current = tracker.getCurrentTurn();
        expect(current).not.toBeNull();
        expect(current?.promptTokens).toBe(0);
        expect(current?.completionTokens).toBe(0);
      });

      it('should record model if provided', () => {
        tracker.startTurn({ model: 'gpt-4' });

        const current = tracker.getCurrentTurn();
        expect(current?.model).toBe('gpt-4');
      });
    });

    describe('updateTurn()', () => {
      it('should update token counts', () => {
        tracker.startTurn();
        tracker.updateTurn({ promptTokens: 100, completionTokens: 50 });

        const current = tracker.getCurrentTurn();
        expect(current?.promptTokens).toBe(100);
        expect(current?.completionTokens).toBe(50);
      });

      it('should accumulate output tokens for streaming', () => {
        tracker.startTurn();
        tracker.updateTurn({ completionTokens: 10 });
        tracker.updateTurn({ completionTokens: 20 });
        tracker.updateTurn({ completionTokens: 30 });

        const current = tracker.getCurrentTurn();
        expect(current?.completionTokens).toBe(30); // Last value, not accumulated
      });

      it('should handle partial updates', () => {
        tracker.startTurn();
        tracker.updateTurn({ promptTokens: 100 });
        tracker.updateTurn({ completionTokens: 50 });

        const current = tracker.getCurrentTurn();
        expect(current?.promptTokens).toBe(100);
        expect(current?.completionTokens).toBe(50);
      });
    });

    describe('endTurn()', () => {
      it('should finalize the turn and update session stats', () => {
        tracker.startTurn({ model: 'claude-3-haiku' });
        tracker.updateTurn({ promptTokens: 100, completionTokens: 200 });
        tracker.endTurn();

        const stats = tracker.getSessionStats();
        expect(stats.totalPromptTokens).toBe(100);
        expect(stats.totalCompletionTokens).toBe(200);
        expect(stats.turnCount).toBe(1);
      });

      it('should clear current turn', () => {
        tracker.startTurn();
        tracker.updateTurn({ promptTokens: 100 });
        tracker.endTurn();

        expect(tracker.getCurrentTurn()).toBeNull();
      });

      it('should accept final values', () => {
        tracker.startTurn();
        tracker.endTurn({ promptTokens: 500, completionTokens: 1000, cost: 0.005 });

        const stats = tracker.getSessionStats();
        expect(stats.totalPromptTokens).toBe(500);
        expect(stats.totalCompletionTokens).toBe(1000);
        expect(stats.totalCost).toBe(0.005);
      });
    });

    describe('getSessionStats()', () => {
      it('should accumulate across multiple turns', () => {
        // Turn 1
        tracker.startTurn();
        tracker.updateTurn({ promptTokens: 100, completionTokens: 200 });
        tracker.endTurn({ cost: 0.001 });

        // Turn 2
        tracker.startTurn();
        tracker.updateTurn({ promptTokens: 150, completionTokens: 300 });
        tracker.endTurn({ cost: 0.002 });

        // Turn 3
        tracker.startTurn();
        tracker.updateTurn({ promptTokens: 200, completionTokens: 400 });
        tracker.endTurn({ cost: 0.003 });

        const stats = tracker.getSessionStats();
        expect(stats.totalPromptTokens).toBe(450);
        expect(stats.totalCompletionTokens).toBe(900);
        expect(stats.totalCost).toBe(0.006);
        expect(stats.turnCount).toBe(3);
      });

      it('should calculate average tokens per turn', () => {
        tracker.startTurn();
        tracker.endTurn({ promptTokens: 100, completionTokens: 200 });
        tracker.startTurn();
        tracker.endTurn({ promptTokens: 200, completionTokens: 400 });

        const stats = tracker.getSessionStats();
        expect(stats.avgPromptTokens).toBe(150);
        expect(stats.avgCompletionTokens).toBe(300);
      });

      it('should track session start time', () => {
        const before = Date.now();
        tracker.startTurn();
        tracker.endTurn();
        const after = Date.now();

        const stats = tracker.getSessionStats();
        expect(stats.sessionStartTime).toBeGreaterThanOrEqual(before);
        expect(stats.sessionStartTime).toBeLessThanOrEqual(after);
      });
    });

    describe('reset()', () => {
      it('should clear all tracking data', () => {
        tracker.startTurn();
        tracker.endTurn({ promptTokens: 1000, completionTokens: 2000, cost: 0.1 });
        tracker.startTurn();
        tracker.endTurn({ promptTokens: 1000, completionTokens: 2000, cost: 0.1 });

        tracker.reset();

        const stats = tracker.getSessionStats();
        expect(stats.totalPromptTokens).toBe(0);
        expect(stats.totalCompletionTokens).toBe(0);
        expect(stats.totalCost).toBe(0);
        expect(stats.turnCount).toBe(0);
      });
    });

    describe('getFormattedStats()', () => {
      it('should return formatted strings', () => {
        tracker.startTurn();
        tracker.endTurn({ promptTokens: 1500, completionTokens: 3000, cost: 0.0025 });

        const formatted = tracker.getFormattedStats();

        expect(formatted.promptTokens).toBe('1.5K');
        expect(formatted.completionTokens).toBe('3.0K');
        expect(formatted.totalTokens).toBe('4.5K');
        expect(formatted.cost).toBe('$0.0025');
        expect(formatted.turns).toBe('1');
      });

      it('should format current turn if active', () => {
        tracker.startTurn();
        tracker.updateTurn({ promptTokens: 500, completionTokens: 100 });

        const formatted = tracker.getFormattedStats();

        expect(formatted.currentPromptTokens).toBe('500');
        expect(formatted.currentCompletionTokens).toBe('100');
      });
    });
  });

  describe('getStatusLine()', () => {
    it('should return a compact status line', () => {
      const tracker = createTokenTracker();
      tracker.startTurn();
      tracker.endTurn({ promptTokens: 1000, completionTokens: 2000, cost: 0.003 });

      const line = tracker.getStatusLine();

      expect(line).toContain('1.0K');
      expect(line).toContain('2.0K');
      expect(line).toContain('$0.003');
    });

    it('should show current turn tokens during streaming', () => {
      const tracker = createTokenTracker();
      tracker.startTurn();
      tracker.updateTurn({ promptTokens: 100, completionTokens: 50 });

      const line = tracker.getStatusLine();

      expect(line).toContain('100');
      expect(line).toContain('50');
    });
  });

  describe('model pricing integration', () => {
    it('should accept model pricing for cost calculation', () => {
      const tracker = createTokenTracker({
        modelPricing: {
          prompt: 0.25,      // $0.25 per 1M input tokens
          completion: 1.25,  // $1.25 per 1M output tokens
        },
      });

      tracker.startTurn();
      tracker.endTurn({ promptTokens: 1000, completionTokens: 1000 });

      const stats = tracker.getSessionStats();
      // Cost = (1000/1M * 0.25) + (1000/1M * 1.25) = 0.00025 + 0.00125 = 0.0015
      expect(stats.totalCost).toBeCloseTo(0.0015, 6);
    });

    it('should update pricing dynamically', () => {
      const tracker = createTokenTracker();

      tracker.setModelPricing({
        prompt: 3.00,      // $3 per 1M
        completion: 15.00, // $15 per 1M
      });

      tracker.startTurn();
      tracker.endTurn({ promptTokens: 1000000, completionTokens: 100000 });

      const stats = tracker.getSessionStats();
      // Cost = 3.00 + 1.50 = 4.50
      expect(stats.totalCost).toBeCloseTo(4.50, 2);
    });
  });
});
