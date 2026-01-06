/**
 * Onboarding Module
 *
 * Checks setup status and helps users configure Zosia.
 * Used by /onboarding slash command in the TUI.
 */
export interface SetupItem {
    name: string;
    status: 'ok' | 'warning' | 'missing';
    message: string;
    howToFix?: string;
}
export interface OnboardingStatus {
    items: SetupItem[];
    overallReady: boolean;
    readyCount: number;
    totalCount: number;
}
/**
 * Check Node.js version
 */
export declare function checkNodeVersion(): SetupItem;
/**
 * Check OpenRouter API key status
 */
export declare function checkOpenRouterKey(): SetupItem;
/**
 * Check Claude Code installation and auth
 */
export declare function checkClaudeCode(): Promise<SetupItem>;
/**
 * Check Graphiti memory connection
 */
export declare function checkGraphiti(): Promise<SetupItem>;
/**
 * Check model configuration
 */
export declare function checkModel(): SetupItem;
/**
 * Check user identity
 */
export declare function checkUserIdentity(): SetupItem;
/**
 * Get full onboarding status
 */
export declare function getOnboardingStatus(): Promise<OnboardingStatus>;
/**
 * Format onboarding status as displayable text
 */
export declare function formatOnboardingStatus(status: OnboardingStatus): string;
/**
 * Set OpenRouter key interactively
 */
export declare function setOpenRouterKeyFromInput(key: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * List available models for selection
 */
export declare function getRecommendedModels(): Array<{
    id: string;
    name: string;
    cost: string;
}>;
/**
 * Set model from selection
 */
export declare function setModelFromInput(modelId: string): Promise<{
    success: boolean;
    message: string;
}>;
//# sourceMappingURL=onboarding.d.ts.map