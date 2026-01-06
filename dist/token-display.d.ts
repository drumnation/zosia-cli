/**
 * Token/Cost Display Module
 *
 * Provides formatting and tracking for token usage and costs.
 * Designed for displaying in the interactive TUI.
 */
/** Model pricing (per 1M tokens in USD) */
export interface ModelPricing {
    prompt: number;
    completion: number;
}
/** Usage data for a single turn - matches OpenRouter API naming */
export interface TurnUsage {
    promptTokens: number;
    completionTokens: number;
    cost?: number;
    model?: string;
    startTime: number;
    endTime?: number;
}
/** Session statistics - matches CostTracking in config.ts */
export interface SessionStats {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCost: number;
    turnCount: number;
    avgPromptTokens: number;
    avgCompletionTokens: number;
    sessionStartTime: number;
}
/** Formatted strings for display */
export interface FormattedStats {
    promptTokens: string;
    completionTokens: string;
    totalTokens: string;
    cost: string;
    turns: string;
    currentPromptTokens?: string;
    currentCompletionTokens?: string;
}
/** Options for formatting cost */
export interface CostFormatOptions {
    showFree?: boolean;
}
/** Token tracker interface */
export interface TokenTracker {
    /** Start a new turn */
    startTurn(options?: {
        model?: string;
    }): void;
    /** Update the current turn with new token counts */
    updateTurn(usage: {
        promptTokens?: number;
        completionTokens?: number;
    }): void;
    /** End the current turn and finalize stats */
    endTurn(finalUsage?: {
        promptTokens?: number;
        completionTokens?: number;
        cost?: number;
    }): void;
    /** Get the current turn if active */
    getCurrentTurn(): TurnUsage | null;
    /** Get session statistics */
    getSessionStats(): SessionStats;
    /** Get formatted stats for display */
    getFormattedStats(): FormattedStats;
    /** Get a compact status line */
    getStatusLine(): string;
    /** Reset all tracking data */
    reset(): void;
    /** Set model pricing for cost calculation */
    setModelPricing(pricing: ModelPricing): void;
}
/**
 * Format a token count with K/M suffix
 */
export declare function formatTokenCount(count: number, precision?: number): string;
/**
 * Format a cost value in USD
 */
export declare function formatCost(cost: number, options?: CostFormatOptions): string;
/** Options for creating a token tracker */
interface TokenTrackerOptions {
    modelPricing?: ModelPricing;
}
/**
 * Create a token tracker for session usage
 */
export declare function createTokenTracker(options?: TokenTrackerOptions): TokenTracker;
export {};
//# sourceMappingURL=token-display.d.ts.map