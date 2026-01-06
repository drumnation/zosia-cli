/**
 * Model Service for Zosia
 *
 * Fetches dynamic model lists from OpenRouter and OpenAI APIs.
 * Caches results to avoid repeated API calls.
 */
// Known embedding models with their pricing (as of 2025)
export const KNOWN_EMBEDDING_MODELS = [
    { id: 'text-embedding-3-small', dimensions: 1536, maxInput: 8192, pricePerMillionTokens: 0.02 },
    { id: 'text-embedding-3-large', dimensions: 3072, maxInput: 8192, pricePerMillionTokens: 0.13 },
    { id: 'text-embedding-ada-002', dimensions: 1536, maxInput: 8192, pricePerMillionTokens: 0.10 },
];
// Default conscious mind model
export const DEFAULT_CONSCIOUS_MODEL = 'google/gemma-2-9b-it';
// Recommended models for Zosia (curated list for quality)
export const RECOMMENDED_CONSCIOUS_MODELS = [
    'google/gemma-2-9b-it', // Current default - good balance
    'google/gemma-2-27b-it', // Larger Gemma for better reasoning
    'anthropic/claude-3-haiku', // Fast, articulate
    'anthropic/claude-3-sonnet', // Balanced quality
    'meta-llama/llama-3-70b-instruct', // Open, capable
    'mistralai/mistral-7b-instruct', // Efficient, articulate
    'mistralai/mixtral-8x7b-instruct', // MoE architecture
    'qwen/qwen-2.5-72b-instruct', // Strong multilingual
];
/**
 * Fetch models from OpenRouter API
 */
export async function fetchOpenRouterModels(apiKey, options = {}) {
    const { debug = false } = options;
    if (debug) {
        console.log('│ 🔍 Fetching OpenRouter models...');
    }
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        // API key is optional for models endpoint but may provide more models
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }
        const data = await response.json();
        const models = data.data.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            contextLength: m.context_length,
            pricing: {
                // Convert string prices (per token) to per-million-tokens
                prompt: parseFloat(m.pricing.prompt) * 1_000_000,
                completion: parseFloat(m.pricing.completion) * 1_000_000,
            },
            inputModalities: m.architecture.input_modalities,
            outputModalities: m.architecture.output_modalities,
            supportedParams: m.supported_parameters,
        }));
        if (debug) {
            console.log(`│ ✓ Found ${models.length} OpenRouter models`);
        }
        return models;
    }
    catch (error) {
        if (debug) {
            console.log(`│ ⚠️ Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
        return [];
    }
}
/**
 * Filter models suitable for conversational AI (Zosia's conscious mind)
 */
export function filterConversationalModels(models) {
    return models.filter((m) => 
    // Text-to-text models only
    m.inputModalities.includes('text') &&
        m.outputModalities.includes('text') &&
        // Has reasonable context length
        m.contextLength >= 4096 &&
        // Supports temperature (needed for personality)
        m.supportedParams.includes('temperature'));
}
/**
 * Filter free models from OpenRouter
 */
export function filterFreeModels(models) {
    return models.filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0);
}
/**
 * Sort models by cost (cheapest first)
 */
export function sortModelsByCost(models) {
    return [...models].sort((a, b) => {
        const costA = a.pricing.prompt + a.pricing.completion;
        const costB = b.pricing.prompt + b.pricing.completion;
        return costA - costB;
    });
}
/**
 * Validate an OpenRouter API key
 */
export async function validateOpenRouterKey(apiKey) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
/**
 * Get model by ID from a list
 */
export function findModelById(models, id) {
    return models.find((m) => m.id === id);
}
/**
 * Format model for display
 */
export function formatModelDisplay(model) {
    const costStr = model.pricing.prompt === 0
        ? '(free)'
        : `($${model.pricing.prompt.toFixed(2)}/$${model.pricing.completion.toFixed(2)} per 1M tokens)`;
    return `${model.name} [${model.id}] ${costStr}`;
}
/**
 * Estimate cost for a chat turn
 */
export function estimateTurnCost(model, inputTokens, outputTokens) {
    return ((inputTokens / 1_000_000) * model.pricing.prompt +
        (outputTokens / 1_000_000) * model.pricing.completion);
}
/**
 * Estimate embedding cost
 */
export function estimateEmbeddingCost(provider, tokens, model) {
    if (provider === 'jina') {
        return 0; // Jina is free
    }
    // OpenAI pricing
    const embeddingModel = KNOWN_EMBEDDING_MODELS.find((m) => m.id === model)
        || KNOWN_EMBEDDING_MODELS[0]; // Default to text-embedding-3-small
    return (tokens / 1_000_000) * embeddingModel.pricePerMillionTokens;
}
