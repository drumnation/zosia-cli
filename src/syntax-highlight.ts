/**
 * Syntax Highlighting Module
 *
 * Parses and highlights code blocks in markdown responses.
 * Uses chalk for terminal color output.
 */

import chalk from 'chalk';

/** Represents a parsed code block */
export interface CodeBlock {
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

/** A segment of the parsed content */
export type Segment =
  | { type: 'text'; content: string }
  | { type: 'code'; index: number };

/** Result of parsing markdown for code blocks */
export interface ParseResult {
  blocks: CodeBlock[];
  segments: Segment[];
  inlineCode: string[];
}

/** Language aliases for normalization */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
};

/** Normalize language name */
function normalizeLanguage(lang: string): string {
  const trimmed = lang.trim().toLowerCase();
  return LANGUAGE_ALIASES[trimmed] || trimmed;
}

/**
 * Parse markdown content to extract code blocks
 */
export function parseCodeBlocks(markdown: string): ParseResult {
  const blocks: CodeBlock[] = [];
  const segments: Segment[] = [];
  const inlineCode: string[] = [];

  if (!markdown) {
    return { blocks, segments: [{ type: 'text', content: '' }], inlineCode };
  }

  // Match fenced code blocks: ```language\ncode\n```
  const codeBlockRegex = /```(\s*\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    // Add text before this code block
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: markdown.slice(lastIndex, match.index),
      });
    }

    // Extract language and code
    const language = match[1].trim();
    const code = match[2].replace(/\n$/, ''); // Remove trailing newline

    blocks.push({
      language,
      code,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });

    segments.push({ type: 'code', index: blocks.length - 1 });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < markdown.length) {
    segments.push({
      type: 'text',
      content: markdown.slice(lastIndex),
    });
  }

  // If no code blocks found, entire content is text
  if (segments.length === 0) {
    segments.push({ type: 'text', content: markdown });
  }

  // Extract inline code (single backticks)
  const inlineRegex = /`([^`]+)`/g;
  let inlineMatch: RegExpExecArray | null;
  while ((inlineMatch = inlineRegex.exec(markdown)) !== null) {
    // Make sure this isn't part of a fenced block (check if inside ```)
    const isInsideFencedBlock = blocks.some(
      (block) =>
        inlineMatch!.index >= block.startIndex &&
        inlineMatch!.index < block.endIndex
    );
    if (!isInsideFencedBlock) {
      inlineCode.push(inlineMatch[1]);
    }
  }

  return { blocks, segments, inlineCode };
}

// Syntax highlighting token patterns for common languages
const TOKEN_PATTERNS: Record<
  string,
  Array<{ pattern: RegExp; style: (s: string) => string }>
> = {
  javascript: [
    {
      pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|this|try|catch|throw|typeof|instanceof)\b/g,
      style: chalk.magenta,
    },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, style: chalk.yellow },
    { pattern: /\b(\d+\.?\d*)\b/g, style: chalk.cyan },
    { pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, style: chalk.green },
    { pattern: /\/\/.*$/gm, style: chalk.gray },
    { pattern: /\/\*[\s\S]*?\*\//g, style: chalk.gray },
  ],
  typescript: [
    {
      pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|this|try|catch|throw|typeof|instanceof|interface|type|enum|namespace|implements|extends|public|private|protected|readonly|abstract|as|is)\b/g,
      style: chalk.magenta,
    },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, style: chalk.yellow },
    { pattern: /\b(string|number|boolean|any|void|never|unknown|object)\b/g, style: chalk.blue },
    { pattern: /\b(\d+\.?\d*)\b/g, style: chalk.cyan },
    { pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, style: chalk.green },
    { pattern: /\/\/.*$/gm, style: chalk.gray },
    { pattern: /\/\*[\s\S]*?\*\//g, style: chalk.gray },
  ],
  python: [
    {
      pattern: /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|raise|with|lambda|pass|break|continue|yield|async|await|and|or|not|in|is)\b/g,
      style: chalk.magenta,
    },
    { pattern: /\b(True|False|None)\b/g, style: chalk.yellow },
    { pattern: /\b(\d+\.?\d*)\b/g, style: chalk.cyan },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, style: chalk.green },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, style: chalk.green },
    { pattern: /#.*$/gm, style: chalk.gray },
  ],
  bash: [
    {
      pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|cd|ls|mkdir|rm|cp|mv|cat|grep|awk|sed|export|source)\b/g,
      style: chalk.magenta,
    },
    { pattern: /\$\w+|\$\{[^}]+\}/g, style: chalk.cyan },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, style: chalk.green },
    { pattern: /#.*$/gm, style: chalk.gray },
  ],
  json: [
    { pattern: /"([^"\\]|\\.)*"(?=\s*:)/g, style: chalk.blue }, // Keys
    { pattern: /"([^"\\]|\\.)*"(?!\s*:)/g, style: chalk.green }, // String values
    { pattern: /\b(true|false|null)\b/g, style: chalk.yellow },
    { pattern: /\b-?\d+\.?\d*([eE][+-]?\d+)?\b/g, style: chalk.cyan },
  ],
};

// Add aliases
TOKEN_PATTERNS.js = TOKEN_PATTERNS.javascript;
TOKEN_PATTERNS.ts = TOKEN_PATTERNS.typescript;
TOKEN_PATTERNS.py = TOKEN_PATTERNS.python;
TOKEN_PATTERNS.sh = TOKEN_PATTERNS.bash;
TOKEN_PATTERNS.shell = TOKEN_PATTERNS.bash;
TOKEN_PATTERNS.zsh = TOKEN_PATTERNS.bash;

/**
 * Highlight code with syntax coloring
 */
export function highlightCode(code: string, language: string): string {
  if (!code) return '';

  const normalizedLang = normalizeLanguage(language);
  const patterns = TOKEN_PATTERNS[normalizedLang];

  if (!patterns) {
    // Unknown language - return as-is
    return code;
  }

  // Apply highlighting by replacing tokens
  let result = code;

  // Track replaced ranges to avoid double-styling
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  for (const { pattern, style } of patterns) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Check if this range overlaps with existing replacements
      const overlaps = replacements.some(
        (r) => start < r.end && end > r.start
      );

      if (!overlaps) {
        replacements.push({
          start,
          end,
          text: style(match[0]),
        });
      }
    }
  }

  // Sort replacements by position (reverse order for safe replacement)
  replacements.sort((a, b) => b.start - a.start);

  // Apply replacements from end to start
  for (const { start, end, text } of replacements) {
    result = result.slice(0, start) + text + result.slice(end);
  }

  return result;
}

/**
 * Format a complete code block with header and highlighting
 */
export function formatCodeBlock(block: CodeBlock): string {
  const header = block.language
    ? chalk.dim(`─── ${block.language} ───`)
    : chalk.dim('─── code ───');

  const highlighted = highlightCode(block.code, block.language);

  return `${header}\n${highlighted}\n${chalk.dim('─'.repeat(20))}`;
}

/**
 * Render markdown with highlighted code blocks
 */
export function renderWithHighlighting(markdown: string): string {
  const { blocks, segments } = parseCodeBlocks(markdown);

  return segments
    .map((segment) => {
      if (segment.type === 'text') {
        // Highlight inline code in text
        return segment.content.replace(/`([^`]+)`/g, (_, code) =>
          chalk.cyan.dim('`') + chalk.cyan(code) + chalk.cyan.dim('`')
        );
      } else {
        return formatCodeBlock(blocks[segment.index]);
      }
    })
    .join('');
}
