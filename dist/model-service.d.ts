/**
 * Model Service for Zosia
 *
 * Fetches dynamic model lists from OpenRouter and OpenAI APIs.
 * Caches results to avoid repeated API calls.
 */
export interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    contextLength: number;
    pricing: {
        prompt: number;
        completion: number;
    };
    inputModalities: string[];
    outputModalities: string[];
    supportedParams: string[];
}
export interface OpenAIModel {
    id: string;
    ownedBy: string;
    created: number;
}
export interface OpenAIEmbeddingModel {
    id: string;
    dimensions: number;
    maxInput: number;
    pricePerMillionTokens: number;
}
export interface ModelCache {
    openrouter?: {
        models: OpenRouterModel[];
        fetchedAt: string;
        ttlHours: number;
    };
    openai?: {
        models: OpenAIModel[];
        fetchedAt: string;
        ttlHours: number;
    };
}
export declare const KNOWN_EMBEDDING_MODELS: OpenAIEmbeddingModel[];
export declare const DEFAULT_CONSCIOUS_MODEL = "google/gemma-2-9b-it";
export declare const RECOMMENDED_CONSCIOUS_MODELS: string[];
/**
 * Fetch models from OpenRouter API
 */
export declare function fetchOpenRouterModels(apiKey?: string, options?: {
    debug?: boolean;
}): Promise<OpenRouterModel[]>;
/**
 * Filter models suitable for conversational AI (Zosia's conscious mind)
 */
export declare function filterConversationalModels(models: OpenRouterModel[]): OpenRouterModel[];
/**
 * Filter free models from OpenRouter
 */
export declare function filterFreeModels(models: OpenRouterModel[]): OpenRouterModel[];
/**
 * Sort models by cost (cheapest first)
 */
export declare function sortModelsByCost(models: OpenRouterModel[]): OpenRouterModel[];
/**
 * Validate an OpenRouter API key
 */
export declare function validateOpenRouterKey(apiKey: string): Promise<boolean>;
/**
 * Get model by ID from a list
 */
export declare function findModelById(models: OpenRouterModel[], id: string): OpenRouterModel | undefined;
/**
 * Format model for display
 */
export declare function formatModelDisplay(model: OpenRouterModel): string;
/**
 * Estimate cost for a chat turn
 */
export declare function estimateTurnCost(model: OpenRouterModel, inputTokens: number, outputTokens: number): number;
/**
 * Estimate embedding cost
 */
export declare function estimateEmbeddingCost(provider: 'jina' | 'openai', tokens: number, model?: string): number;
//# sourceMappingURL=model-service.d.ts.map