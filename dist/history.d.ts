/**
 * Input History Module
 *
 * Manages input history for the interactive CLI with navigation
 * (up/down arrows) and optional persistence to disk.
 */
/** Configuration options for history manager */
export interface HistoryOptions {
    /** Maximum number of entries to keep */
    maxSize?: number;
    /** Path to persist history (optional) */
    persistPath?: string;
}
/** History manager interface */
export interface HistoryManager {
    /** Add an entry to history */
    add(entry: string): void;
    /** Get previous entry (up arrow) */
    previous(): string | null;
    /** Get next entry (down arrow) */
    next(): string | null;
    /** Get current entry during navigation */
    getCurrent(): string | null;
    /** Get all history entries */
    getHistory(): string[];
    /** Reset navigation state */
    reset(): void;
    /** Clear all history */
    clear(): void;
    /** Search history for entries containing query */
    search(query: string): string[];
}
/**
 * Create a history manager
 */
export declare function createHistoryManager(options?: HistoryOptions): HistoryManager;
/**
 * Get the default history file path
 */
export declare function getDefaultHistoryPath(): string;
//# sourceMappingURL=history.d.ts.map