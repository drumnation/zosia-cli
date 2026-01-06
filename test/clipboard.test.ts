/**
 * Clipboard Integration Tests - TDD
 *
 * Tests for copying responses and code blocks to clipboard.
 * These tests are written FIRST before implementation (RED phase).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the module we're going to build
import {
  copyToClipboard,
  extractLastResponse,
  extractCodeBlock,
  type CopyResult,
} from '../src/clipboard.js';

// Mock clipboardy since we can't access system clipboard in tests
vi.mock('clipboardy', () => ({
  default: {
    write: vi.fn().mockResolvedValue(undefined),
    writeSync: vi.fn(),
    read: vi.fn().mockResolvedValue(''),
    readSync: vi.fn().mockReturnValue(''),
  },
}));

describe('Clipboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('copyToClipboard()', () => {
    it('should copy text to clipboard and return success', async () => {
      const result = await copyToClipboard('Hello, World!');

      expect(result.success).toBe(true);
      expect(result.copiedText).toBe('Hello, World!');
      expect(result.characterCount).toBe(13);
    });

    it('should handle empty text', async () => {
      const result = await copyToClipboard('');

      expect(result.success).toBe(true);
      expect(result.copiedText).toBe('');
      expect(result.characterCount).toBe(0);
    });

    it('should handle multi-line text', async () => {
      const multiLine = 'Line 1\nLine 2\nLine 3';
      const result = await copyToClipboard(multiLine);

      expect(result.success).toBe(true);
      expect(result.copiedText).toBe(multiLine);
      expect(result.lineCount).toBe(3);
    });

    it('should handle errors gracefully', async () => {
      const clipboardy = await import('clipboardy');
      vi.mocked(clipboardy.default.write).mockRejectedValueOnce(
        new Error('Clipboard unavailable')
      );

      const result = await copyToClipboard('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Clipboard unavailable');
    });
  });

  describe('extractLastResponse()', () => {
    it('should extract the last response from conversation history', () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
        { role: 'assistant', content: 'I am doing well, thank you!' },
      ];

      const result = extractLastResponse(history);

      expect(result).toBe('I am doing well, thank you!');
    });

    it('should return null if no assistant messages', () => {
      const history = [
        { role: 'user', content: 'Hello' },
      ];

      const result = extractLastResponse(history);

      expect(result).toBeNull();
    });

    it('should return null for empty history', () => {
      const result = extractLastResponse([]);

      expect(result).toBeNull();
    });

    it('should handle history with only user messages', () => {
      const history = [
        { role: 'user', content: 'First message' },
        { role: 'user', content: 'Second message' },
      ];

      const result = extractLastResponse(history);

      expect(result).toBeNull();
    });
  });

  describe('extractCodeBlock()', () => {
    it('should extract the first code block from text', () => {
      const text = `Here is some code:

\`\`\`javascript
const x = 42;
console.log(x);
\`\`\`

And some more text.`;

      const result = extractCodeBlock(text);

      expect(result).not.toBeNull();
      expect(result?.language).toBe('javascript');
      expect(result?.code).toBe('const x = 42;\nconsole.log(x);');
    });

    it('should extract code block by index', () => {
      const text = `\`\`\`javascript
first();
\`\`\`

\`\`\`python
second()
\`\`\``;

      const first = extractCodeBlock(text, 0);
      const second = extractCodeBlock(text, 1);

      expect(first?.language).toBe('javascript');
      expect(second?.language).toBe('python');
    });

    it('should return null if no code blocks', () => {
      const text = 'Just plain text without any code blocks.';

      const result = extractCodeBlock(text);

      expect(result).toBeNull();
    });

    it('should return null if index out of range', () => {
      const text = `\`\`\`javascript
only one
\`\`\``;

      const result = extractCodeBlock(text, 5);

      expect(result).toBeNull();
    });

    it('should extract code block by language', () => {
      const text = `\`\`\`javascript
js code
\`\`\`

\`\`\`python
py code
\`\`\`

\`\`\`javascript
more js
\`\`\``;

      const result = extractCodeBlock(text, 0, 'python');

      expect(result?.language).toBe('python');
      expect(result?.code).toBe('py code');
    });
  });

  describe('integration scenarios', () => {
    it('should copy last response to clipboard', async () => {
      const history = [
        { role: 'user', content: 'Write hello world in Python' },
        {
          role: 'assistant',
          content: `Here's hello world in Python:

\`\`\`python
print("Hello, World!")
\`\`\`

This will output "Hello, World!" to the console.`,
        },
      ];

      const lastResponse = extractLastResponse(history);
      expect(lastResponse).not.toBeNull();

      const result = await copyToClipboard(lastResponse!);
      expect(result.success).toBe(true);
    });

    it('should copy specific code block from response', async () => {
      const text = `Here are two examples:

\`\`\`typescript
const greeting = "Hello";
\`\`\`

\`\`\`python
greeting = "Hello"
\`\`\``;

      const codeBlock = extractCodeBlock(text, 1); // Get Python block
      expect(codeBlock).not.toBeNull();

      const result = await copyToClipboard(codeBlock!.code);
      expect(result.success).toBe(true);
      expect(result.copiedText).toBe('greeting = "Hello"');
    });
  });
});
