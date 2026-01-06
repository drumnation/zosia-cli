/**
 * Clipboard Integration Module
 *
 * Provides functionality for copying responses and code blocks to clipboard.
 * Uses clipboardy for cross-platform clipboard access.
 */

import clipboard from 'clipboardy';

/** Result of a clipboard copy operation */
export interface CopyResult {
  success: boolean;
  copiedText?: string;
  characterCount?: number;
  lineCount?: number;
  error?: string;
}

/** A conversation message */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Extracted code block */
export interface ExtractedCodeBlock {
  language: string;
  code: string;
  index: number;
}

/**
 * Copy text to the system clipboard
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  try {
    await clipboard.write(text);

    const lines = text.split('\n');
    return {
      success: true,
      copiedText: text,
      characterCount: text.length,
      lineCount: lines.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown clipboard error',
    };
  }
}

/**
 * Extract the last assistant response from conversation history
 */
export function extractLastResponse(history: Message[]): string | null {
  // Find the last assistant message
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant') {
      return history[i].content;
    }
  }
  return null;
}

/**
 * Extract a code block from text
 *
 * @param text - The text containing code blocks
 * @param index - Which code block to extract (0-indexed)
 * @param language - Optional language filter
 */
export function extractCodeBlock(
  text: string,
  index: number = 0,
  language?: string
): ExtractedCodeBlock | null {
  // Match fenced code blocks: ```language\ncode\n```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: ExtractedCodeBlock[] = [];

  let match: RegExpExecArray | null;
  let blockIndex = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const blockLanguage = match[1].trim();
    const code = match[2].replace(/\n$/, ''); // Remove trailing newline

    // If language filter specified, skip non-matching blocks
    if (language && blockLanguage !== language) {
      continue;
    }

    blocks.push({
      language: blockLanguage,
      code,
      index: blockIndex++,
    });
  }

  // Return the block at the specified index
  if (index < 0 || index >= blocks.length) {
    return null;
  }

  return blocks[index];
}

/**
 * Count code blocks in text
 */
export function countCodeBlocks(text: string): number {
  const codeBlockRegex = /```\w*\n[\s\S]*?```/g;
  const matches = text.match(codeBlockRegex);
  return matches ? matches.length : 0;
}

/**
 * Get all code blocks from text
 */
export function getAllCodeBlocks(text: string): ExtractedCodeBlock[] {
  const blocks: ExtractedCodeBlock[] = [];
  let index = 0;

  let block: ExtractedCodeBlock | null;
  while ((block = extractCodeBlock(text, index)) !== null) {
    blocks.push(block);
    index++;
  }

  return blocks;
}
