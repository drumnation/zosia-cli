/**
 * Model Service for Zosia
 *
 * Fetches dynamic model lists from OpenRouter and OpenAI APIs.
 * Caches results to avoid repeated API calls.
 */

// OpenRouter model structure
export interface OpenRouterModel {
  id: string;                    // e.g., 'google/gemma-2-9b-it'
  name: string;                  // Human-readable name
  description?: string;
  contextLength: number;
  pricing: {
    prompt: number;              // Cost per 1M input tokens (USD)
    completion: number;          // Cost per 1M output tokens (USD)
  };
  inputModalities: string[];     // ['text', 'image', etc.]
  outputModalities: string[];
  supportedParams: string[];     // ['temperature', 'top_p', etc.]
}

// OpenAI model structure
export interface OpenAIModel {
  id: string;
  ownedBy: string;
  created: number;
}

// OpenAI embedding model with pricing
export interface OpenAIEmbeddingModel {
  id: string;
  dimensions: number;
  maxInput: number;
  pricePerMillionTokens: number; // USD
}

// Model cache structure
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

// Known embedding models with their pricing (as of 2025)
export const KNOWN_EMBEDDING_MODELS: OpenAIEmbeddingModel[] = [
  { id: 'text-embedding-3-small', dimensions: 1536, maxInput: 8192, pricePerMillionTokens: 0.02 },
  { id: 'text-embedding-3-large', dimensions: 3072, maxInput: 8192, pricePerMillionTokens: 0.13 },
  { id: 'text-embedding-ada-002', dimensions: 1536, maxInput: 8192, pricePerMillionTokens: 0.10 },
];

// Default conscious mind model
export const DEFAULT_CONSCIOUS_MODEL = 'anthropic/claude-haiku-4.5';

// Recommended models for Zosia - RANKED BY EXPERIMENT SCORES (2026-01-08)
// Use Ctrl+] to cycle forward, Ctrl+[ to cycle back in interactive mode
export const RECOMMENDED_CONSCIOUS_MODELS = [
  // === TOP TIER (94-100% scores) ===
  'arcee-ai/trinity-mini:free',        // #1 - 100% score, FREE! Best overall
  'anthropic/claude-haiku-4.5',        // 94%, best paid quality/cost
  'z-ai/glm-4.5-air:free',             // 94%, FREE, excellent
  'mistralai/mistral-nemo',            // 94%, cheap ($0.02/M)
  'meta-llama/llama-3.1-8b-instruct',  // 94%, cheap ($0.02/M)
  'x-ai/grok-3-mini-beta',             // 94%, mid-tier
  'x-ai/grok-3-beta',                  // 94%, premium
  'anthropic/claude-3.5-sonnet',       // 94%, premium
  'anthropic/claude-opus-4.5',         // 94%, premium flagship

  // === 92% TIER ===
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', // 92%, FREE, uncensored

  // === HIGH TIER (89% scores) ===
  'minimax/minimax-m2.1',              // 89%, cheap, great for coding
  'minimax/minimax-m1',                // 89%, cheap, 456B MoE
  'qwen/qwen-2.5-72b-instruct',        // 89%, cheap, multilingual
  'deepseek/deepseek-r1-0528:free',    // 89%, FREE, reasoning model
  'tngtech/deepseek-r1t2-chimera:free', // 89%, FREE, reasoning hybrid
  'liquid/lfm2-8b-a1b',                // 89%, ultra-cheap ($0.01/M)
  'qwen/qwen3-max',                    // 89%, mid-tier
  'nvidia/llama-3.1-nemotron-70b-instruct', // 89%, mid-tier
  'perplexity/sonar',                  // 89%, mid-tier, web search
  'openai/gpt-4-turbo',                // 89%, premium

  // === GOOD TIER (83% scores) ===
  'google/gemma-3-27b-it:free',        // 83%, FREE, solid choice
  'meta-llama/llama-3.3-70b-instruct:free', // 83%, FREE, large
  'anthropic/claude-sonnet-4.5',       // 83%, premium, 1M context
  'mistralai/mistral-large-2411',      // 83%, mid-tier
  'cohere/command-r-08-2024',          // 83%, cheap, RAG optimized
];

/**
 * Fetch models from OpenRouter API
 */
export async function fetchOpenRouterModels(
  apiKey?: string,
  options: { debug?: boolean } = {}
): Promise<OpenRouterModel[]> {
  const { debug = false } = options;

  if (debug) {
    console.log('│ 🔍 Fetching OpenRouter models...');
  }

  try {
    const headers: Record<string, string> = {
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

    const data = await response.json() as {
      data: Array<{
        id: string;
        name: string;
        description?: string;
        context_length: number;
        pricing: {
          prompt: string;
          completion: string;
        };
        architecture: {
          input_modalities: string[];
          output_modalities: string[];
        };
        supported_parameters: string[];
      }>;
    };

    const models: OpenRouterModel[] = data.data.map((m) => ({
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
  } catch (error) {
    if (debug) {
      console.log(`│ ⚠️ Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
    return [];
  }
}

/**
 * Filter models suitable for conversational AI (Zosia's conscious mind)
 */
export function filterConversationalModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.filter((m) =>
    // Text-to-text models only
    m.inputModalities.includes('text') &&
    m.outputModalities.includes('text') &&
    // Has reasonable context length
    m.contextLength >= 4096 &&
    // Supports temperature (needed for personality)
    m.supportedParams.includes('temperature')
  );
}

/**
 * Filter free models from OpenRouter
 */
export function filterFreeModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.filter((m) =>
    m.pricing.prompt === 0 && m.pricing.completion === 0
  );
}

/**
 * Sort models by cost (cheapest first)
 */
export function sortModelsByCost(models: OpenRouterModel[]): OpenRouterModel[] {
  return [...models].sort((a, b) => {
    const costA = a.pricing.prompt + a.pricing.completion;
    const costB = b.pricing.prompt + b.pricing.completion;
    return costA - costB;
  });
}

/**
 * Validate an OpenRouter API key
 */
export async function validateOpenRouterKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get model by ID from a list
 */
export function findModelById(models: OpenRouterModel[], id: string): OpenRouterModel | undefined {
  return models.find((m) => m.id === id);
}

/**
 * Format model for display
 */
export function formatModelDisplay(model: OpenRouterModel): string {
  const costStr = model.pricing.prompt === 0
    ? '(free)'
    : `($${model.pricing.prompt.toFixed(2)}/$${model.pricing.completion.toFixed(2)} per 1M tokens)`;

  return `${model.name} [${model.id}] ${costStr}`;
}

/**
 * Estimate cost for a chat turn
 */
export function estimateTurnCost(
  model: OpenRouterModel,
  inputTokens: number,
  outputTokens: number
): number {
  return (
    (inputTokens / 1_000_000) * model.pricing.prompt +
    (outputTokens / 1_000_000) * model.pricing.completion
  );
}

/**
 * Estimate embedding cost
 */
export function estimateEmbeddingCost(
  provider: 'jina' | 'openai',
  tokens: number,
  model?: string
): number {
  if (provider === 'jina') {
    return 0; // Jina is free
  }

  // OpenAI pricing
  const embeddingModel = KNOWN_EMBEDDING_MODELS.find((m) => m.id === model)
    || KNOWN_EMBEDDING_MODELS[0]; // Default to text-embedding-3-small

  return (tokens / 1_000_000) * embeddingModel.pricePerMillionTokens;
}

/**
 * Get the next model in the recommended list (cycle forward)
 */
export function getNextRecommendedModel(currentModel: string): string {
  const idx = RECOMMENDED_CONSCIOUS_MODELS.indexOf(currentModel);
  if (idx === -1) {
    // Current model not in list, start at beginning
    return RECOMMENDED_CONSCIOUS_MODELS[0];
  }
  const nextIdx = (idx + 1) % RECOMMENDED_CONSCIOUS_MODELS.length;
  return RECOMMENDED_CONSCIOUS_MODELS[nextIdx];
}

/**
 * Get the previous model in the recommended list (cycle backward)
 */
export function getPreviousRecommendedModel(currentModel: string): string {
  const idx = RECOMMENDED_CONSCIOUS_MODELS.indexOf(currentModel);
  if (idx === -1) {
    // Current model not in list, start at end
    return RECOMMENDED_CONSCIOUS_MODELS[RECOMMENDED_CONSCIOUS_MODELS.length - 1];
  }
  const prevIdx = idx === 0 ? RECOMMENDED_CONSCIOUS_MODELS.length - 1 : idx - 1;
  return RECOMMENDED_CONSCIOUS_MODELS[prevIdx];
}

/**
 * Get model info for display (short format)
 */
export function getModelShortInfo(modelId: string): { name: string; tier: string; score: string } {
  // Extract name from ID
  const name = modelId.split('/').pop()?.replace(':free', '') || modelId;

  // Determine tier from the recommended list position
  // Structure: TOP (0-8), 92% (9), HIGH (10-19), GOOD (20+)
  const idx = RECOMMENDED_CONSCIOUS_MODELS.indexOf(modelId);
  let tier = 'unknown';
  let score = '?';

  if (idx >= 0 && idx < 9) {
    tier = 'TOP';
    score = idx === 0 ? '100%' : '94%';
  } else if (idx === 9) {
    tier = 'TOP';
    score = '92%';
  } else if (idx >= 10 && idx < 20) {
    tier = 'HIGH';
    score = '89%';
  } else if (idx >= 20) {
    tier = 'GOOD';
    score = '83%';
  }

  // Check if free
  if (modelId.includes(':free')) {
    tier += ' FREE';
  }

  return { name, tier, score };
}

/**
 * Get current model index in recommended list (1-indexed for display)
 */
export function getModelPosition(modelId: string): { current: number; total: number } {
  const idx = RECOMMENDED_CONSCIOUS_MODELS.indexOf(modelId);
  return {
    current: idx === -1 ? 0 : idx + 1,
    total: RECOMMENDED_CONSCIOUS_MODELS.length
  };
}
