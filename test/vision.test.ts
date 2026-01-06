/**
 * Vision Model Tests
 *
 * Tests for vision model detection and multimodal content handling
 */

import { describe, it, expect } from 'vitest';
import { isVisionModel } from '../src/i-layer.js';

describe('Vision Model Support', () => {
  describe('isVisionModel()', () => {
    describe('should recognize vision-capable models', () => {
      it('should detect OpenAI GPT-4o', () => {
        expect(isVisionModel('openai/gpt-4o')).toBe(true);
      });

      it('should detect OpenAI GPT-4o-mini', () => {
        expect(isVisionModel('openai/gpt-4o-mini')).toBe(true);
      });

      it('should detect OpenAI GPT-4-vision', () => {
        expect(isVisionModel('openai/gpt-4-vision-preview')).toBe(true);
      });

      it('should detect Claude 3.5 Sonnet', () => {
        expect(isVisionModel('anthropic/claude-3.5-sonnet')).toBe(true);
      });

      it('should detect Claude 3 Opus', () => {
        expect(isVisionModel('anthropic/claude-3-opus')).toBe(true);
      });

      it('should detect Claude 3 Sonnet', () => {
        expect(isVisionModel('anthropic/claude-3-sonnet')).toBe(true);
      });

      it('should detect Claude 3 Haiku', () => {
        expect(isVisionModel('anthropic/claude-3-haiku')).toBe(true);
      });

      it('should detect Google Gemini Pro Vision', () => {
        expect(isVisionModel('google/gemini-pro-vision')).toBe(true);
      });

      it('should detect Google Gemini 1.5 Pro', () => {
        expect(isVisionModel('google/gemini-1.5-pro')).toBe(true);
      });

      it('should detect Google Gemini 1.5 Flash', () => {
        expect(isVisionModel('google/gemini-1.5-flash')).toBe(true);
      });
    });

    describe('should NOT recognize non-vision models', () => {
      it('should not detect GPT-3.5 Turbo', () => {
        expect(isVisionModel('openai/gpt-3.5-turbo')).toBe(false);
      });

      it('should not detect Claude 2', () => {
        expect(isVisionModel('anthropic/claude-2')).toBe(false);
      });

      it('should not detect Mistral', () => {
        expect(isVisionModel('mistral/mistral-7b-instruct')).toBe(false);
      });

      it('should not detect LLaMA', () => {
        expect(isVisionModel('meta-llama/llama-2-70b-chat')).toBe(false);
      });

      it('should not detect random model names', () => {
        expect(isVisionModel('some/random-model')).toBe(false);
      });
    });

    describe('should handle model variants', () => {
      it('should detect versioned Claude 3.5 Sonnet', () => {
        expect(isVisionModel('anthropic/claude-3-5-sonnet-20241022')).toBe(true);
      });
    });
  });
});
