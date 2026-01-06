/**
 * Token/Cost Display Module
 *
 * Provides formatting and tracking for token usage and costs.
 * Designed for displaying in the interactive TUI.
 */
/**
 * Format a token count with K/M suffix
 */
export function formatTokenCount(count, precision = 1) {
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
export function formatCost(cost, options = {}) {
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
/**
 * Create a token tracker for session usage
 */
export function createTokenTracker(options = {}) {
    let currentTurn = null;
    let completedTurns = [];
    let sessionStartTime = Date.now();
    let modelPricing = options.modelPricing || null;
    const calculateCost = (promptTokens, completionTokens) => {
        if (!modelPricing)
            return 0;
        return ((promptTokens / 1_000_000) * modelPricing.prompt +
            (completionTokens / 1_000_000) * modelPricing.completion);
    };
    return {
        startTurn(opts) {
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
        updateTurn(usage) {
            if (!currentTurn)
                return;
            if (usage.promptTokens !== undefined) {
                currentTurn.promptTokens = usage.promptTokens;
            }
            if (usage.completionTokens !== undefined) {
                currentTurn.completionTokens = usage.completionTokens;
            }
        },
        endTurn(finalUsage) {
            if (!currentTurn)
                return;
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
        getCurrentTurn() {
            return currentTurn;
        },
        getSessionStats() {
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
        getFormattedStats() {
            const stats = this.getSessionStats();
            const totalTokens = stats.totalPromptTokens + stats.totalCompletionTokens;
            const formatted = {
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
        getStatusLine() {
            const stats = this.getSessionStats();
            const formatted = this.getFormattedStats();
            // If actively in a turn, show current turn stats
            if (currentTurn) {
                return `↑${formatTokenCount(currentTurn.promptTokens)} ↓${formatTokenCount(currentTurn.completionTokens)}`;
            }
            // Otherwise show session totals
            return `↑${formatted.promptTokens} ↓${formatted.completionTokens} ${formatted.cost}`;
        },
        reset() {
            currentTurn = null;
            completedTurns = [];
            sessionStartTime = Date.now();
        },
        setModelPricing(pricing) {
            modelPricing = pricing;
        },
    };
}
