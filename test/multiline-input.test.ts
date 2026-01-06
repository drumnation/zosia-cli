/**
 * Multi-line Input Tests - TDD
 *
 * Tests for multi-line input handling with Shift+Enter or Alt+Enter.
 * These tests are written FIRST before implementation (RED phase).
 */

import { describe, it, expect, vi } from 'vitest';

// Import the module we're going to build
import {
  createMultilineHandler,
  type MultilineHandler,
  type KeyEvent,
} from '../src/multiline-input.js';

describe('Multi-line Input', () => {
  describe('createMultilineHandler()', () => {
    it('should create a handler with initial empty value', () => {
      const handler = createMultilineHandler();

      expect(handler.getValue()).toBe('');
      expect(handler.getLines()).toEqual(['']);
      expect(handler.getCursorLine()).toBe(0);
    });

    it('should accept initial value', () => {
      const handler = createMultilineHandler('Hello world');

      expect(handler.getValue()).toBe('Hello world');
      expect(handler.getLines()).toEqual(['Hello world']);
    });

    it('should handle initial multi-line value', () => {
      const handler = createMultilineHandler('Line 1\nLine 2\nLine 3');

      expect(handler.getValue()).toBe('Line 1\nLine 2\nLine 3');
      expect(handler.getLines()).toEqual(['Line 1', 'Line 2', 'Line 3']);
      expect(handler.getLineCount()).toBe(3);
    });
  });

  describe('setValue()', () => {
    it('should update the value', () => {
      const handler = createMultilineHandler();

      handler.setValue('New value');

      expect(handler.getValue()).toBe('New value');
    });

    it('should handle multi-line values', () => {
      const handler = createMultilineHandler();

      handler.setValue('Line 1\nLine 2');

      expect(handler.getLines()).toEqual(['Line 1', 'Line 2']);
    });
  });

  describe('insertNewline()', () => {
    it('should insert a newline at the end', () => {
      const handler = createMultilineHandler('Line 1');

      handler.insertNewline();

      expect(handler.getValue()).toBe('Line 1\n');
      expect(handler.getLines()).toEqual(['Line 1', '']);
    });

    it('should track that we are now multi-line', () => {
      const handler = createMultilineHandler('Single line');

      expect(handler.isMultiline()).toBe(false);

      handler.insertNewline();

      expect(handler.isMultiline()).toBe(true);
    });

    it('should work with empty initial value', () => {
      const handler = createMultilineHandler();

      handler.insertNewline();

      expect(handler.getValue()).toBe('\n');
      expect(handler.getLines()).toEqual(['', '']);
    });

    it('should insert multiple newlines', () => {
      const handler = createMultilineHandler('Line 1');

      handler.insertNewline();
      handler.setValue('Line 1\nLine 2');
      handler.insertNewline();
      handler.setValue('Line 1\nLine 2\nLine 3');

      expect(handler.getLineCount()).toBe(3);
    });
  });

  describe('handleKey()', () => {
    it('should return "submit" for Enter without modifiers', () => {
      const handler = createMultilineHandler('Hello');

      const result = handler.handleKey({
        return: true,
        shift: false,
        meta: false,
        ctrl: false,
      });

      expect(result).toBe('submit');
    });

    it('should return "newline" for Shift+Enter', () => {
      const handler = createMultilineHandler('Hello');

      const result = handler.handleKey({
        return: true,
        shift: true,
        meta: false,
        ctrl: false,
      });

      expect(result).toBe('newline');
    });

    it('should return "newline" for Alt+Enter (meta)', () => {
      const handler = createMultilineHandler('Hello');

      const result = handler.handleKey({
        return: true,
        shift: false,
        meta: true,
        ctrl: false,
      });

      expect(result).toBe('newline');
    });

    it('should return "newline" for Ctrl+Enter', () => {
      const handler = createMultilineHandler('Hello');

      const result = handler.handleKey({
        return: true,
        shift: false,
        meta: false,
        ctrl: true,
      });

      expect(result).toBe('newline');
    });

    it('should return null for non-enter keys', () => {
      const handler = createMultilineHandler('Hello');

      const result = handler.handleKey({
        return: false,
        shift: true,
        meta: false,
        ctrl: false,
      });

      expect(result).toBeNull();
    });
  });

  describe('clear()', () => {
    it('should reset value to empty', () => {
      const handler = createMultilineHandler('Line 1\nLine 2');

      handler.clear();

      expect(handler.getValue()).toBe('');
      expect(handler.getLines()).toEqual(['']);
      expect(handler.isMultiline()).toBe(false);
    });
  });

  describe('getDisplayLines()', () => {
    it('should return lines for display', () => {
      const handler = createMultilineHandler('Line 1\nLine 2\nLine 3');

      const lines = handler.getDisplayLines();

      expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should handle empty string', () => {
      const handler = createMultilineHandler('');

      const lines = handler.getDisplayLines();

      expect(lines).toEqual(['']);
    });

    it('should truncate to maxLines if specified', () => {
      const handler = createMultilineHandler('1\n2\n3\n4\n5');

      const lines = handler.getDisplayLines(3);

      expect(lines).toHaveLength(3);
      // Should show last 3 lines (most recent input)
      expect(lines).toEqual(['3', '4', '5']);
    });
  });

  describe('getPromptPrefix()', () => {
    it('should return ">" for single line', () => {
      const handler = createMultilineHandler('Hello');

      expect(handler.getPromptPrefix()).toBe('>');
    });

    it('should return line indicator for multi-line', () => {
      const handler = createMultilineHandler('Line 1\nLine 2');

      expect(handler.getPromptPrefix()).toBe('[2]');
    });

    it('should update as lines are added', () => {
      const handler = createMultilineHandler('1');

      expect(handler.getPromptPrefix()).toBe('>');

      handler.insertNewline();
      handler.setValue('1\n2');

      expect(handler.getPromptPrefix()).toBe('[2]');

      handler.insertNewline();
      handler.setValue('1\n2\n3');

      expect(handler.getPromptPrefix()).toBe('[3]');
    });
  });

  describe('edge cases', () => {
    it('should handle trailing newline', () => {
      const handler = createMultilineHandler('Line 1\n');

      expect(handler.getLines()).toEqual(['Line 1', '']);
      expect(handler.getLineCount()).toBe(2);
    });

    it('should handle multiple consecutive newlines', () => {
      const handler = createMultilineHandler('Line 1\n\n\nLine 4');

      expect(handler.getLines()).toEqual(['Line 1', '', '', 'Line 4']);
      expect(handler.getLineCount()).toBe(4);
    });

    it('should handle only newlines', () => {
      const handler = createMultilineHandler('\n\n');

      expect(handler.getLines()).toEqual(['', '', '']);
      expect(handler.getLineCount()).toBe(3);
    });

    it('should preserve whitespace in lines', () => {
      const handler = createMultilineHandler('  indented\n    more indented');

      expect(handler.getLines()).toEqual(['  indented', '    more indented']);
    });
  });

  describe('terminal key detection', () => {
    // Terminal escape sequences can vary - test common patterns
    it('should detect Escape+Enter as newline (terminal workaround)', () => {
      const handler = createMultilineHandler('Hello');

      // Some terminals send escape sequence for Alt+Enter
      const result = handler.handleKey({
        return: true,
        shift: false,
        meta: false,
        ctrl: false,
        escape: true, // Custom escape flag
      });

      expect(result).toBe('newline');
    });
  });
});
