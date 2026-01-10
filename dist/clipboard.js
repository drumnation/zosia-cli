/**
 * Clipboard Integration Module
 *
 * Provides functionality for copying responses and code blocks to clipboard.
 * Uses clipboardy for cross-platform clipboard access.
 */
import clipboard from 'clipboardy';
import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
/**
 * Copy text to the system clipboard
 */
export async function copyToClipboard(text) {
    try {
        await clipboard.write(text);
        const lines = text.split('\n');
        return {
            success: true,
            copiedText: text,
            characterCount: text.length,
            lineCount: lines.length,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown clipboard error',
        };
    }
}
/**
 * Extract the last assistant response from conversation history
 */
export function extractLastResponse(history) {
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
export function extractCodeBlock(text, index = 0, language) {
    // Match fenced code blocks: ```language\ncode\n```
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
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
export function countCodeBlocks(text) {
    const codeBlockRegex = /```\w*\n[\s\S]*?```/g;
    const matches = text.match(codeBlockRegex);
    return matches ? matches.length : 0;
}
/**
 * Get all code blocks from text
 */
export function getAllCodeBlocks(text) {
    const blocks = [];
    let index = 0;
    let block;
    while ((block = extractCodeBlock(text, index)) !== null) {
        blocks.push(block);
        index++;
    }
    return blocks;
}
/**
 * Check if clipboard contains an image (macOS only)
 */
function clipboardHasImage() {
    if (process.platform !== 'darwin') {
        return false;
    }
    try {
        const info = execSync('osascript -e "clipboard info"', { encoding: 'utf-8' });
        return info.includes('«class PNGf»') ||
            info.includes('«class TIFF»') ||
            info.includes('TIFF') ||
            info.includes('public.png') ||
            info.includes('public.tiff');
    }
    catch {
        return false;
    }
}
/**
 * Save clipboard image to a file (macOS only)
 * Returns the path to the saved image
 */
function saveClipboardImage() {
    if (process.platform !== 'darwin') {
        return null;
    }
    try {
        // Create zosia temp directory
        const zosiaDir = join(tmpdir(), 'zosia-clipboard');
        if (!existsSync(zosiaDir)) {
            mkdirSync(zosiaDir, { recursive: true });
        }
        const timestamp = Date.now();
        const imagePath = join(zosiaDir, `clipboard-${timestamp}.png`);
        // AppleScript to save clipboard image as PNG
        const script = `
      set theFile to POSIX file "${imagePath}"
      try
        set imageData to the clipboard as «class PNGf»
        set fileRef to open for access theFile with write permission
        write imageData to fileRef
        close access fileRef
        return "success"
      on error errMsg
        try
          close access theFile
        end try
        return "error: " & errMsg
      end try
    `;
        const result = execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, {
            encoding: 'utf-8'
        }).trim();
        if (result === 'success') {
            return imagePath;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Read from clipboard - handles both text and images
 * For images, saves to temp file and returns the path
 */
export async function pasteFromClipboard() {
    try {
        // First check if clipboard has an image (macOS)
        if (clipboardHasImage()) {
            const imagePath = saveClipboardImage();
            if (imagePath) {
                return {
                    type: 'image',
                    imagePath,
                };
            }
        }
        // Try to read text
        const text = await clipboard.read();
        if (text && text.trim()) {
            return {
                type: 'text',
                text,
            };
        }
        return { type: 'empty' };
    }
    catch (error) {
        return {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown clipboard error',
        };
    }
}
/**
 * Synchronous paste - for use in useInput handlers
 */
export function pasteFromClipboardSync() {
    try {
        // First check if clipboard has an image (macOS)
        if (clipboardHasImage()) {
            const imagePath = saveClipboardImage();
            if (imagePath) {
                return {
                    type: 'image',
                    imagePath,
                };
            }
        }
        // Try to read text synchronously
        const text = clipboard.readSync();
        if (text && text.trim()) {
            return {
                type: 'text',
                text,
            };
        }
        return { type: 'empty' };
    }
    catch (error) {
        return {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown clipboard error',
        };
    }
}
