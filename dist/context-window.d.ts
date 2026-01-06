/**
 * Context Window Indicator Module
 *
 * Tracks and displays context window usage for the current model.
 * Contract: Uses OpenRouter model.context_length (API) / contextLength (internal)
 */
/** Context usage data */
export interface ContextUsage {
    usedTokens: number;
    contextLength: number;
    percentUsed: number;
}
/** Warning levels based on context usage */
export type WarningLevel = 'low' | 'medium' | 'high' | 'critical';
/** Context tracker interface */
export interface ContextTracker {
    /** Add tokens from a turn */
    addTokens(tokens: {
        promptTokens: number;
        completionTokens: number;
    }): void;
    /** Get current usage */
    getUsage(): ContextUsage;
    /** Set new context length (model change) */
    setContextLength(length: number): void;
    /** Reset token count (new conversation) */
    reset(): void;
    /** Get warning level based on usage */
    getWarningLevel(): WarningLevel;
}
/** Options for creating a context tracker */
interface ContextTrackerOptions {
    /** Context length from OpenRouter model.context_length */
    contextLength: number;
}
/**
 * Calculate context usage percentage
 */
export declare function getContextPercentage(usedTokens: number, contextLength: number): number;
/**
 * Format context usage for display
 */
export declare function formatContextUsage(usage: ContextUsage): string;
/**
 * Create a context tracker
 */
export declare function createContextTracker(options: ContextTrackerOptions): ContextTracker;
export {};
//# sourceMappingURL=context-window.d.ts.map