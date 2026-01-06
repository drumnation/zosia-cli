/**
 * Context Window Indicator Module
 *
 * Tracks and displays context window usage for the current model.
 * Contract: Uses OpenRouter model.context_length (API) / contextLength (internal)
 */

import { formatTokenCount } from './token-display.js';

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
  addTokens(tokens: { promptTokens: number; completionTokens: number }): void;
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
export function getContextPercentage(usedTokens: number, contextLength: number): number {
  if (contextLength <= 0) {
    return 0;
  }

  const percentage = (usedTokens / contextLength) * 100;
  return Math.min(100, Math.round(percentage));
}

/**
 * Format context usage for display
 */
export function formatContextUsage(usage: ContextUsage): string {
  const usedDisplay = formatTokenCount(usage.usedTokens);
  const totalDisplay = formatTokenCount(usage.contextLength);
  const percent = usage.percentUsed;

  // Visual bar (10 chars wide)
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return `${usedDisplay}/${totalDisplay} [${bar}] ${percent}%`;
}

/**
 * Create a context tracker
 */
export function createContextTracker(options: ContextTrackerOptions): ContextTracker {
  let usedTokens = 0;
  let contextLength = options.contextLength;

  const getPercentage = (): number => {
    return getContextPercentage(usedTokens, contextLength);
  };

  return {
    addTokens(tokens: { promptTokens: number; completionTokens: number }): void {
      usedTokens += tokens.promptTokens + tokens.completionTokens;
    },

    getUsage(): ContextUsage {
      return {
        usedTokens,
        contextLength,
        percentUsed: getPercentage(),
      };
    },

    setContextLength(length: number): void {
      contextLength = length;
    },

    reset(): void {
      usedTokens = 0;
    },

    getWarningLevel(): WarningLevel {
      const percent = getPercentage();

      if (percent >= 90) {
        return 'critical';
      }
      if (percent >= 75) {
        return 'high';
      }
      if (percent >= 50) {
        return 'medium';
      }
      return 'low';
    },
  };
}
