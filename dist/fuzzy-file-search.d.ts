/**
 * Fuzzy File Search Module
 *
 * Provides "@" triggered fuzzy file search like Toad.
 * Type "@" to start searching, results filter as you type.
 * Respects .gitignore patterns.
 *
 * Usage:
 *   @file.ts          - Search for files matching "file.ts"
 *   @src/comp         - Search in paths matching "src/comp"
 *   @                 - Show all files (limited)
 */
export interface FileEntry {
    /** Relative path from cwd */
    path: string;
    /** Just the filename */
    name: string;
    /** Directory containing the file */
    dir: string;
    /** File extension */
    ext: string;
}
export interface SearchResult {
    file: FileEntry;
    score: number;
}
export interface FuzzySearchState {
    /** Whether we're in search mode (after @) */
    active: boolean;
    /** The search query (text after @) */
    query: string;
    /** Position of @ in the input */
    atPosition: number;
    /** Search results */
    results: SearchResult[];
    /** Currently selected result index */
    selectedIndex: number;
}
/**
 * Scan files in the current working directory
 */
export declare function scanFiles(cwd?: string): Promise<FileEntry[]>;
/**
 * Invalidate the file cache (call after file operations)
 */
export declare function invalidateFileCache(): void;
/**
 * Search files with fuzzy matching
 */
export declare function searchFiles(query: string, cwd?: string, maxResults?: number): Promise<SearchResult[]>;
/**
 * Detect if input contains an active @ search trigger
 * Returns the search state if active, null otherwise
 */
export declare function detectAtSearch(input: string, cursorPosition?: number): FuzzySearchState | null;
/**
 * Replace the @ query with the selected file path
 */
export declare function replaceAtQuery(input: string, atPosition: number, query: string, selectedPath: string): string;
/**
 * Get icon for a file based on extension
 */
export declare function getFileIcon(ext: string): string;
/**
 * Format a file entry for display
 */
export declare function formatFileEntry(file: FileEntry, maxWidth?: number): string;
declare const _default: {
    scanFiles: typeof scanFiles;
    searchFiles: typeof searchFiles;
    detectAtSearch: typeof detectAtSearch;
    replaceAtQuery: typeof replaceAtQuery;
    invalidateFileCache: typeof invalidateFileCache;
    getFileIcon: typeof getFileIcon;
    formatFileEntry: typeof formatFileEntry;
};
export default _default;
//# sourceMappingURL=fuzzy-file-search.d.ts.map