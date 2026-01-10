import { type OpenRouterModel, type ModelCache } from './model-service.js';
export type EmbeddingProviderType = 'jina' | 'openai';
export interface EmbeddingProviderConfig {
    type: EmbeddingProviderType;
    enabled: boolean;
    apiKey?: string;
    model: string;
    dimensions: number;
    task?: string;
    maxTokensPerRequest: number;
    rateLimitPerMinute: number;
}
export interface EmbeddingServiceConfig {
    preferredProvider: EmbeddingProviderType;
    fallbackOrder: EmbeddingProviderType[];
    autoFallback: boolean;
    providers: {
        jina: EmbeddingProviderConfig;
        openai: EmbeddingProviderConfig;
    };
}
export interface CostTracking {
    enabled: boolean;
    totalEmbeddingTokens: number;
    totalEmbeddingCostUsd: number;
    embeddingsByProvider: {
        jina: {
            tokens: number;
            cost: number;
        };
        openai: {
            tokens: number;
            cost: number;
        };
    };
    totalLlmInputTokens: number;
    totalLlmOutputTokens: number;
    totalLlmCostUsd: number;
    llmCostsByModel: Record<string, {
        inputTokens: number;
        outputTokens: number;
        cost: number;
    }>;
    lastReset: string;
    sessionCount: number;
}
export interface ConsciousMindConfig {
    model: string;
    temperature: number;
    maxTokens: number;
}
export interface MindSkillsConfig {
    enabled: string[];
    disabled: string[];
}
export interface CustomPrompts {
    conscious?: string;
    subconscious?: string;
    identityKernel?: string;
    handoff?: string;
}
export interface HandoffSettings {
    prompt?: string;
    threshold: number;
    enabled: boolean;
}
export interface ConfigData {
    preferredEmbeddingProvider: EmbeddingProviderType;
    openaiApiKey?: string;
    openaiKeyValid?: boolean;
    openaiKeyValidatedAt?: string;
    autoFallbackEnabled: boolean;
    openrouterApiKey?: string;
    openrouterKeyValid?: boolean;
    openrouterKeyValidatedAt?: string;
    consciousMind: ConsciousMindConfig;
    customPrompts?: CustomPrompts;
    mindSkills?: MindSkillsConfig;
    costTracking: CostTracking;
    modelCache?: ModelCache;
    handoffSettings?: HandoffSettings;
}
export declare function loadConfig(): ConfigData;
export declare function saveConfig(config: ConfigData): void;
export declare function getPreferredProvider(): EmbeddingProviderType;
export declare function setPreferredProvider(provider: EmbeddingProviderType): Promise<void>;
export declare function validateOpenAIKey(apiKey: string): Promise<boolean>;
export declare function setOpenAIKey(apiKey: string): Promise<boolean>;
export declare function clearOpenAIKey(): Promise<void>;
export declare function getEmbeddingServiceConfig(): EmbeddingServiceConfig;
export declare function getConfigSummary(): string;
export declare function setOpenRouterKey(apiKey: string): Promise<boolean>;
export declare function clearOpenRouterKey(): Promise<void>;
export declare function getOpenRouterKey(): string | undefined;
export declare function getConsciousMindConfig(): ConsciousMindConfig;
export declare function setConsciousMindModel(model: string): Promise<void>;
export declare function setConsciousMindTemperature(temperature: number): Promise<void>;
export declare function setConsciousMindMaxTokens(maxTokens: number): Promise<void>;
export declare function getCustomPrompts(): CustomPrompts | undefined;
export declare function setCustomPrompt(type: 'conscious' | 'subconscious' | 'identityKernel', prompt: string): Promise<void>;
export declare function clearCustomPrompt(type: 'conscious' | 'subconscious' | 'identityKernel'): Promise<void>;
export declare function clearAllCustomPrompts(): Promise<void>;
export declare function getMindSkillsConfig(): MindSkillsConfig;
export declare function enableMindSkill(skillId: string): Promise<void>;
export declare function disableMindSkill(skillId: string): Promise<void>;
export declare function resetMindSkills(): Promise<void>;
export declare const getSkillsConfig: typeof getMindSkillsConfig;
export declare const enableSkill: typeof enableMindSkill;
export declare const disableSkill: typeof disableMindSkill;
export declare const resetSkills: typeof resetMindSkills;
export declare function getHandoffSettings(): HandoffSettings;
export declare function setHandoffPrompt(prompt: string): Promise<void>;
export declare function clearHandoffPrompt(): Promise<void>;
export declare function setHandoffThreshold(threshold: number): Promise<void>;
export declare function setHandoffEnabled(enabled: boolean): Promise<void>;
export declare function getCostTracking(): CostTracking;
export declare function setCostTrackingEnabled(enabled: boolean): void;
export declare function trackEmbeddingUsage(provider: 'jina' | 'openai', tokens: number, cost: number): void;
export declare function trackLlmUsage(model: string, inputTokens: number, outputTokens: number, cost: number): void;
export declare function incrementSessionCount(): void;
export declare function resetCostTracking(): void;
export declare function getCachedModels(): Promise<OpenRouterModel[]>;
export declare function clearModelCache(): void;
export declare function resetToDefaults(): void;
//# sourceMappingURL=config.d.ts.map