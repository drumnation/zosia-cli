/**
 * Context Window Indicator Module
 *
 * Tracks and displays context window usage for the current model.
 * Contract: Uses OpenRouter model.context_length (API) / contextLength (internal)
 */
import { formatTokenCount } from './token-display.js';
/**
 * Calculate context usage percentage
 */
export function getContextPercentage(usedTokens, contextLength) {
    if (contextLength <= 0) {
        return 0;
    }
    const percentage = (usedTokens / contextLength) * 100;
    return Math.min(100, Math.round(percentage));
}
/**
 * Format context usage for display
 */
export function formatContextUsage(usage) {
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
export function createContextTracker(options) {
    let usedTokens = 0;
    let contextLength = options.contextLength;
    const getPercentage = () => {
        return getContextPercentage(usedTokens, contextLength);
    };
    return {
        addTokens(tokens) {
            usedTokens += tokens.promptTokens + tokens.completionTokens;
        },
        getUsage() {
            return {
                usedTokens,
                contextLength,
                percentUsed: getPercentage(),
            };
        },
        setContextLength(length) {
            contextLength = length;
        },
        reset() {
            usedTokens = 0;
        },
        getWarningLevel() {
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
