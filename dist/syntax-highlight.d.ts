/**
 * Syntax Highlighting Module
 *
 * Parses and highlights code blocks in markdown responses.
 * Uses chalk for terminal color output.
 */
/** Represents a parsed code block */
export interface CodeBlock {
    language: string;
    code: string;
    startIndex: number;
    endIndex: number;
}
/** A segment of the parsed content */
export type Segment = {
    type: 'text';
    content: string;
} | {
    type: 'code';
    index: number;
};
/** Result of parsing markdown for code blocks */
export interface ParseResult {
    blocks: CodeBlock[];
    segments: Segment[];
    inlineCode: string[];
}
/**
 * Parse markdown content to extract code blocks
 */
export declare function parseCodeBlocks(markdown: string): ParseResult;
/**
 * Highlight code with syntax coloring
 */
export declare function highlightCode(code: string, language: string): string;
/**
 * Format a complete code block with header and highlighting
 */
export declare function formatCodeBlock(block: CodeBlock): string;
/**
 * Render markdown with highlighted code blocks
 */
export declare function renderWithHighlighting(markdown: string): string;
//# sourceMappingURL=syntax-highlight.d.ts.map