/**
 * Context Handoff Tests - TDD
 *
 * Tests for context window handoff when approaching capacity.
 * The handoff creates a compressed summary via the unconscious mind,
 * preserving essential context while freeing token space.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  DEFAULT_HANDOFF_PROMPT,
  getHandoffConfig,
  setHandoffPrompt,
  resetHandoffPrompt,
  createHandoffSummary,
  shouldTriggerHandoff,
  type HandoffConfig,
  type HandoffResult,
  type ConversationContext,
} from '../src/context-handoff.js';

describe('Context Handoff', () => {
  describe('DEFAULT_HANDOFF_PROMPT', () => {
    it('should be a non-empty string', () => {
      expect(typeof DEFAULT_HANDOFF_PROMPT).toBe('string');
      expect(DEFAULT_HANDOFF_PROMPT.length).toBeGreaterThan(100);
    });

    it('should reference key concepts for summarization', () => {
      const prompt = DEFAULT_HANDOFF_PROMPT.toLowerCase();
      // Should mention what to preserve
      expect(prompt).toMatch(/emotion|feeling|state/);
      expect(prompt).toMatch(/topic|subject|theme/);
      expect(prompt).toMatch(/decision|conclusion|agreement/);
    });

    it('should instruct for compression not data dump', () => {
      const prompt = DEFAULT_HANDOFF_PROMPT.toLowerCase();
      // Should emphasize natural/remembering style
      expect(prompt).toMatch(/natural|organic|remember/);
    });
  });

  describe('getHandoffConfig()', () => {
    it('should return default config when not customized', () => {
      const config = getHandoffConfig();

      expect(config.prompt).toBe(DEFAULT_HANDOFF_PROMPT);
      expect(config.threshold).toBeGreaterThan(0);
      expect(config.threshold).toBeLessThanOrEqual(100);
      expect(config.enabled).toBe(true);
    });

    it('should have sensible default threshold', () => {
      const config = getHandoffConfig();
      // Default should trigger before context is completely full
      expect(config.threshold).toBe(80);
    });
  });

  describe('setHandoffPrompt()', () => {
    it('should allow custom prompt', async () => {
      const customPrompt = 'Summarize the key points in 3 sentences.';

      await setHandoffPrompt(customPrompt);
      const config = getHandoffConfig();

      expect(config.prompt).toBe(customPrompt);
    });

    it('should persist across calls', async () => {
      const customPrompt = 'Custom handoff instructions here.';

      await setHandoffPrompt(customPrompt);

      // Simulate reload
      const config = getHandoffConfig();
      expect(config.prompt).toBe(customPrompt);
    });
  });

  describe('resetHandoffPrompt()', () => {
    it('should restore default prompt', async () => {
      // First set custom
      await setHandoffPrompt('Custom prompt');
      expect(getHandoffConfig().prompt).toBe('Custom prompt');

      // Then reset
      await resetHandoffPrompt();
      expect(getHandoffConfig().prompt).toBe(DEFAULT_HANDOFF_PROMPT);
    });
  });

  describe('shouldTriggerHandoff()', () => {
    it('should return true when above threshold', () => {
      expect(shouldTriggerHandoff(85, 80)).toBe(true);
      expect(shouldTriggerHandoff(80, 80)).toBe(true);
      expect(shouldTriggerHandoff(100, 80)).toBe(true);
    });

    it('should return false when below threshold', () => {
      expect(shouldTriggerHandoff(79, 80)).toBe(false);
      expect(shouldTriggerHandoff(50, 80)).toBe(false);
      expect(shouldTriggerHandoff(0, 80)).toBe(false);
    });

    it('should use config threshold if not specified', () => {
      // With default threshold of 80
      expect(shouldTriggerHandoff(85)).toBe(true);
      expect(shouldTriggerHandoff(75)).toBe(false);
    });
  });

  describe('createHandoffSummary()', () => {
    it('should return a HandoffResult', async () => {
      const context: ConversationContext = {
        messages: [
          { role: 'user', content: 'Hello, how are you?' },
          { role: 'assistant', content: 'I am well, thank you for asking.' },
        ],
        currentEmotion: 'curious',
        currentTopic: 'greeting',
        tokenCount: 150,
      };

      const result = await createHandoffSummary(context);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('tokensSaved');
      expect(result).toHaveProperty('preservedContext');
    });

    it('should include essential preserved context fields', async () => {
      const context: ConversationContext = {
        messages: [
          { role: 'user', content: 'Test message' },
        ],
        currentEmotion: 'neutral',
        currentTopic: 'testing',
        tokenCount: 100,
      };

      const result = await createHandoffSummary(context);

      expect(result.preservedContext).toHaveProperty('lastEmotion');
      expect(result.preservedContext).toHaveProperty('lastTopic');
      expect(result.preservedContext).toHaveProperty('keyPoints');
    });

    it('should report tokens saved', async () => {
      const context: ConversationContext = {
        messages: [
          { role: 'user', content: 'A '.repeat(500) }, // Long message
          { role: 'assistant', content: 'B '.repeat(500) },
        ],
        currentEmotion: 'focused',
        currentTopic: 'work',
        tokenCount: 2000,
      };

      const result = await createHandoffSummary(context);

      // Summary should be shorter than original
      expect(result.tokensSaved).toBeGreaterThan(0);
    });
  });

  describe('handoff prompt structure', () => {
    it('should support template variables', () => {
      const prompt = DEFAULT_HANDOFF_PROMPT;

      // Should have placeholders for dynamic content
      expect(prompt).toContain('{{messages}}');
      expect(prompt).toContain('{{emotion}}');
      expect(prompt).toContain('{{topic}}');
    });
  });
});
