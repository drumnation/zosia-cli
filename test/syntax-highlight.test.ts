/**
 * Syntax Highlighting Tests - TDD
 *
 * Tests for parsing and highlighting code blocks in responses.
 * These tests are written FIRST before implementation (RED phase).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import chalk from 'chalk';

// Force chalk to output colors in test environment
beforeAll(() => {
  chalk.level = 3; // Force truecolor support
});

// Import the module we're going to build
import {
  parseCodeBlocks,
  highlightCode,
  type CodeBlock,
} from '../src/syntax-highlight.js';

describe('Syntax Highlighting', () => {
  describe('parseCodeBlocks()', () => {
    it('should extract fenced code blocks with language', () => {
      const markdown = `Here is some code:

\`\`\`typescript
const x = 42;
console.log(x);
\`\`\`

And some text after.`;

      const result = parseCodeBlocks(markdown);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0]).toMatchObject({
        language: 'typescript',
        code: 'const x = 42;\nconsole.log(x);',
      });
    });

    it('should handle code blocks without language specifier', () => {
      const markdown = `\`\`\`
plain code here
\`\`\``;

      const result = parseCodeBlocks(markdown);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].language).toBe('');
      expect(result.blocks[0].code).toBe('plain code here');
    });

    it('should extract multiple code blocks', () => {
      const markdown = `First block:

\`\`\`javascript
const a = 1;
\`\`\`

Second block:

\`\`\`python
x = 2
\`\`\``;

      const result = parseCodeBlocks(markdown);

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].language).toBe('javascript');
      expect(result.blocks[1].language).toBe('python');
    });

    it('should return text segments between code blocks', () => {
      const markdown = `Text before

\`\`\`js
code
\`\`\`

Text after`;

      const result = parseCodeBlocks(markdown);

      expect(result.segments).toHaveLength(3);
      expect(result.segments[0]).toMatchObject({ type: 'text', content: 'Text before\n\n' });
      expect(result.segments[1]).toMatchObject({ type: 'code', index: 0 });
      expect(result.segments[2]).toMatchObject({ type: 'text', content: '\n\nText after' });
    });

    it('should handle inline code (backticks)', () => {
      const markdown = 'Use `const` for constants and `let` for variables.';
      const result = parseCodeBlocks(markdown);

      expect(result.inlineCode).toHaveLength(2);
      expect(result.inlineCode[0]).toBe('const');
      expect(result.inlineCode[1]).toBe('let');
    });

    it('should handle empty input', () => {
      const result = parseCodeBlocks('');

      expect(result.blocks).toHaveLength(0);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]).toMatchObject({ type: 'text', content: '' });
    });

    it('should handle input with no code blocks', () => {
      const markdown = 'Just plain text without any code.';
      const result = parseCodeBlocks(markdown);

      expect(result.blocks).toHaveLength(0);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].type).toBe('text');
    });

    it('should preserve code block indentation', () => {
      const markdown = `\`\`\`python
def foo():
    return 42
\`\`\``;

      const result = parseCodeBlocks(markdown);

      expect(result.blocks[0].code).toBe('def foo():\n    return 42');
    });

    it('should handle nested backticks in code', () => {
      const markdown = `\`\`\`bash
echo \`date\`
\`\`\``;

      const result = parseCodeBlocks(markdown);

      expect(result.blocks[0].code).toBe('echo `date`');
    });
  });

  describe('highlightCode()', () => {
    it('should return highlighted string for known languages', () => {
      const code = 'const x = 42;';
      const result = highlightCode(code, 'javascript');

      // Should contain ANSI escape codes for highlighting
      expect(result).toContain('\x1b['); // ANSI escape
      expect(result).toContain('const');
    });

    it('should return plain code for unknown languages', () => {
      const code = 'some random code';
      const result = highlightCode(code, 'unknownlang');

      // Should just return the code without errors
      expect(result).toBe(code);
    });

    it('should handle TypeScript', () => {
      const code = 'interface User { name: string; }';
      const result = highlightCode(code, 'typescript');

      expect(result).toContain('interface');
    });

    it('should handle Python', () => {
      const code = 'def hello(): pass';
      const result = highlightCode(code, 'python');

      expect(result).toContain('def');
    });

    it('should handle shell/bash', () => {
      const code = 'echo $HOME';
      const result = highlightCode(code, 'bash');

      expect(result).toContain('echo');
    });

    it('should handle JSON', () => {
      const code = '{"key": "value"}';
      const result = highlightCode(code, 'json');

      expect(result).toContain('key');
    });

    it('should handle empty code', () => {
      const result = highlightCode('', 'javascript');
      expect(result).toBe('');
    });

    it('should normalize language aliases', () => {
      // js -> javascript
      const jsResult = highlightCode('const x = 1;', 'js');
      const javascriptResult = highlightCode('const x = 1;', 'javascript');

      // Both should produce similar output (with highlighting)
      expect(jsResult).toContain('\x1b[');
      expect(javascriptResult).toContain('\x1b[');
    });

    it('should handle ts alias for typescript', () => {
      const result = highlightCode('const x: number = 1;', 'ts');
      expect(result).toContain('\x1b[');
    });

    it('should handle sh alias for bash', () => {
      const result = highlightCode('ls -la', 'sh');
      expect(result).toContain('ls');
    });
  });

  describe('language detection edge cases', () => {
    it('should handle language with version numbers', () => {
      const markdown = `\`\`\`python3
print("hello")
\`\`\``;

      const result = parseCodeBlocks(markdown);
      expect(result.blocks[0].language).toBe('python3');
    });

    it('should handle language with extra spaces', () => {
      const markdown = `\`\`\`  javascript
const x = 1;
\`\`\``;

      const result = parseCodeBlocks(markdown);
      expect(result.blocks[0].language).toBe('javascript');
    });

    it('should handle common language mappings', () => {
      const languages = ['jsx', 'tsx', 'yml', 'yaml', 'dockerfile', 'makefile'];

      for (const lang of languages) {
        const markdown = `\`\`\`${lang}
code
\`\`\``;
        const result = parseCodeBlocks(markdown);
        expect(result.blocks[0].language).toBe(lang);
      }
    });
  });
});
