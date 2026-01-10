/**
 * Clipboard Integration Module
 *
 * Provides functionality for copying responses and code blocks to clipboard.
 * Uses clipboardy for cross-platform clipboard access.
 */
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
export declare function copyToClipboard(text: string): Promise<CopyResult>;
/**
 * Extract the last assistant response from conversation history
 */
export declare function extractLastResponse(history: Message[]): string | null;
/**
 * Extract a code block from text
 *
 * @param text - The text containing code blocks
 * @param index - Which code block to extract (0-indexed)
 * @param language - Optional language filter
 */
export declare function extractCodeBlock(text: string, index?: number, language?: string): ExtractedCodeBlock | null;
/**
 * Count code blocks in text
 */
export declare function countCodeBlocks(text: string): number;
/**
 * Get all code blocks from text
 */
export declare function getAllCodeBlocks(text: string): ExtractedCodeBlock[];
/** Result of a clipboard paste operation */
export interface PasteResult {
    type: 'text' | 'image' | 'empty' | 'error';
    text?: string;
    imagePath?: string;
    error?: string;
}
/**
 * Read from clipboard - handles both text and images
 * For images, saves to temp file and returns the path
 */
export declare function pasteFromClipboard(): Promise<PasteResult>;
/**
 * Synchronous paste - for use in useInput handlers
 */
export declare function pasteFromClipboardSync(): PasteResult;
//# sourceMappingURL=clipboard.d.ts.map