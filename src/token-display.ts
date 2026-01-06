/**
 * Token/Cost Display Module
 *
 * Provides formatting and tracking for token usage and costs.
 * Designed for displaying in the interactive TUI.
 */

/** Model pricing (per 1M tokens in USD) */
export interface ModelPricing {
  prompt: number;      // Cost per 1M input tokens
  completion: number;  // Cost per 1M output tokens
}

/** Usage data for a single turn - matches OpenRouter API naming */
export interface TurnUsage {
  promptTokens: number;      // Input tokens (matches API: prompt_tokens)
  completionTokens: number;  // Output tokens (matches API: completion_tokens)
  cost?: number;
  model?: string;
  startTime: number;
  endTime?: number;
}

/** Session statistics - matches CostTracking in config.ts */
export interface SessionStats {
  totalPromptTokens: number;      // Matches: totalLlmInputTokens
  totalCompletionTokens: number;  // Matches: totalLlmOutputTokens
  totalCost: number;              // Matches: totalLlmCostUsd
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
  startTurn(options?: { model?: string }): void;
  /** Update the current turn with new token counts */
  updateTurn(usage: { promptTokens?: number; completionTokens?: number }): void;
  /** End the current turn and finalize stats */
  endTurn(finalUsage?: { promptTokens?: number; completionTokens?: number; cost?: number }): void;
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
export function formatTokenCount(count: number, precision: number = 1): string {
  // Handle edge cases
  if (!Number.isFinite(count) || count < 0) {
    return '0';
  }

  if (count < 1000) {
    return Math.floor(count).toString();
  }

  if (count < 1_000_000) {
    const k = count / 1000;
    return `${k.toFixed(precision)}K`;
  }

  const m = count / 1_000_000;
  return `${m.toFixed(precision)}M`;
}

/**
 * Format a cost value in USD
 */
export function formatCost(cost: number, options: CostFormatOptions = {}): string {
  if (cost === 0) {
    return options.showFree ? 'FREE' : '$0.00';
  }

  // For very small values
  if (cost < 0.000001) {
    return '<$0.000001';
  }

  // Determine precision based on magnitude, strip trailing zeros
  if (cost < 0.0001) {
    return `$${parseFloat(cost.toFixed(6))}`;
  }
  if (cost < 0.001) {
    return `$${parseFloat(cost.toFixed(5))}`;
  }
  if (cost < 0.01) {
    return `$${parseFloat(cost.toFixed(4))}`;
  }

  // Normal formatting for cents and dollars
  return `$${cost.toFixed(2)}`;
}

/** Options for creating a token tracker */
interface TokenTrackerOptions {
  modelPricing?: ModelPricing;
}

/**
 * Create a token tracker for session usage
 */
export function createTokenTracker(options: TokenTrackerOptions = {}): TokenTracker {
  let currentTurn: TurnUsage | null = null;
  let completedTurns: TurnUsage[] = [];
  let sessionStartTime: number = Date.now();
  let modelPricing: ModelPricing | null = options.modelPricing || null;

  const calculateCost = (promptTokens: number, completionTokens: number): number => {
    if (!modelPricing) return 0;

    return (
      (promptTokens / 1_000_000) * modelPricing.prompt +
      (completionTokens / 1_000_000) * modelPricing.completion
    );
  };

  return {
    startTurn(opts?: { model?: string }): void {
      currentTurn = {
        promptTokens: 0,
        completionTokens: 0,
        model: opts?.model,
        startTime: Date.now(),
      };

      // Set session start time on first turn
      if (completedTurns.length === 0) {
        sessionStartTime = Date.now();
      }
    },

    updateTurn(usage: { promptTokens?: number; completionTokens?: number }): void {
      if (!currentTurn) return;

      if (usage.promptTokens !== undefined) {
        currentTurn.promptTokens = usage.promptTokens;
      }
      if (usage.completionTokens !== undefined) {
        currentTurn.completionTokens = usage.completionTokens;
      }
    },

    endTurn(finalUsage?: { promptTokens?: number; completionTokens?: number; cost?: number }): void {
      if (!currentTurn) return;

      // Apply final values if provided
      if (finalUsage) {
        if (finalUsage.promptTokens !== undefined) {
          currentTurn.promptTokens = finalUsage.promptTokens;
        }
        if (finalUsage.completionTokens !== undefined) {
          currentTurn.completionTokens = finalUsage.completionTokens;
        }
        if (finalUsage.cost !== undefined) {
          currentTurn.cost = finalUsage.cost;
        }
      }

      // Calculate cost if not provided and pricing is available
      if (currentTurn.cost === undefined && modelPricing) {
        currentTurn.cost = calculateCost(currentTurn.promptTokens, currentTurn.completionTokens);
      }

      currentTurn.endTime = Date.now();
      completedTurns.push(currentTurn);
      currentTurn = null;
    },

    getCurrentTurn(): TurnUsage | null {
      return currentTurn;
    },

    getSessionStats(): SessionStats {
      const totalPromptTokens = completedTurns.reduce((sum, t) => sum + t.promptTokens, 0);
      const totalCompletionTokens = completedTurns.reduce((sum, t) => sum + t.completionTokens, 0);
      const totalCost = completedTurns.reduce((sum, t) => sum + (t.cost || 0), 0);
      const turnCount = completedTurns.length;

      return {
        totalPromptTokens,
        totalCompletionTokens,
        totalCost,
        turnCount,
        avgPromptTokens: turnCount > 0 ? totalPromptTokens / turnCount : 0,
        avgCompletionTokens: turnCount > 0 ? totalCompletionTokens / turnCount : 0,
        sessionStartTime,
      };
    },

    getFormattedStats(): FormattedStats {
      const stats = this.getSessionStats();
      const totalTokens = stats.totalPromptTokens + stats.totalCompletionTokens;

      const formatted: FormattedStats = {
        promptTokens: formatTokenCount(stats.totalPromptTokens),
        completionTokens: formatTokenCount(stats.totalCompletionTokens),
        totalTokens: formatTokenCount(totalTokens),
        cost: formatCost(stats.totalCost),
        turns: stats.turnCount.toString(),
      };

      // Include current turn if active
      if (currentTurn) {
        formatted.currentPromptTokens = formatTokenCount(currentTurn.promptTokens);
        formatted.currentCompletionTokens = formatTokenCount(currentTurn.completionTokens);
      }

      return formatted;
    },

    getStatusLine(): string {
      const stats = this.getSessionStats();
      const formatted = this.getFormattedStats();

      // If actively in a turn, show current turn stats
      if (currentTurn) {
        return `↑${formatTokenCount(currentTurn.promptTokens)} ↓${formatTokenCount(currentTurn.completionTokens)}`;
      }

      // Otherwise show session totals
      return `↑${formatted.promptTokens} ↓${formatted.completionTokens} ${formatted.cost}`;
    },

    reset(): void {
      currentTurn = null;
      completedTurns = [];
      sessionStartTime = Date.now();
    },

    setModelPricing(pricing: ModelPricing): void {
      modelPricing = pricing;
    },
  };
}
