/**
 * I-Layer: Conscious Mind via OpenRouter
 * Receives Mindstate, produces response using configured model
 */

import type { Mindstate } from './types.js';
import { I_LAYER_PROMPT, IDENTITY_KERNEL } from './prompts.js';
import {
  getConsciousMindConfig,
  getOpenRouterKey,
  getCustomPrompts,
  trackLlmUsage,
  getCostTracking,
} from './config.js';
import { estimateTurnCost, findModelById, fetchOpenRouterModels } from './model-service.js';
import type { ImageContent } from './attachments.js';

interface ConsciousResponse {
  response: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  model: string;
  costUsd?: number;
}

interface ConsciousOptions {
  previousResponse?: string;
  instruction?: string;
  debug?: boolean;
  /** Images to include in the message (for vision-capable models) */
  images?: ImageContent[];
}

/** Vision-capable models that support image input */
const VISION_MODELS = new Set([
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-5-sonnet-20241022',
  'anthropic/claude-3-opus',
  'anthropic/claude-3-sonnet',
  'anthropic/claude-3-haiku',
  'openai/gpt-4-vision-preview',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'google/gemini-pro-vision',
  'google/gemini-1.5-pro',
  'google/gemini-1.5-flash',
]);

/** Default vision model to use when images are attached and current model doesn't support vision */
const DEFAULT_VISION_MODEL = 'openai/gpt-4o-mini';

/** OpenRouter multimodal message content types */
type TextContent = { type: 'text'; text: string };
type ImageUrlContent = { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };
type MultimodalContent = TextContent | ImageUrlContent;

/** Message type for OpenRouter API (supports both string and multimodal content) */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MultimodalContent[];
}

/**
 * Check if a model supports vision/images
 */
export function isVisionModel(modelId: string): boolean {
  // Check exact match first
  if (VISION_MODELS.has(modelId)) return true;
  // Check partial match for model variants
  for (const visionModel of VISION_MODELS) {
    if (modelId.includes(visionModel) || visionModel.includes(modelId)) {
      return true;
    }
  }
  return false;
}

/**
 * Build multimodal content array with text and images
 */
function buildMultimodalContent(text: string, images: ImageContent[]): MultimodalContent[] {
  const content: MultimodalContent[] = [];

  // Add images first (many vision models prefer images before text)
  for (const image of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64}`,
        detail: 'auto'
      }
    });
  }

  // Add text content
  content.push({ type: 'text', text });

  return content;
}

// Cache for model pricing info (populated on first call)
let modelPricingCache: Map<string, { prompt: number; completion: number }> | null = null;

/**
 * Format Mindstate for injection into prompt
 */
function formatMindstate(mindstate: Mindstate): string {
  const parts: string[] = [];

  parts.push('---');
  parts.push('CURRENT MINDSTATE:');
  parts.push('');

  // Working Memory
  parts.push('Working Memory:');
  if (mindstate.workingMemory.lastTopic) {
    parts.push(`- Last topic: ${mindstate.workingMemory.lastTopic}`);
  }
  if (mindstate.workingMemory.emotionalBaseline) {
    parts.push(`- Emotional baseline: ${mindstate.workingMemory.emotionalBaseline}`);
  }
  if (mindstate.workingMemory.openLoops?.length) {
    parts.push(`- Open loops: ${mindstate.workingMemory.openLoops.join(', ')}`);
  }
  if (!mindstate.workingMemory.lastTopic) {
    parts.push('- (First conversation)');
  }
  parts.push('');

  // Associations
  parts.push('Associations:');
  if (mindstate.associations.length === 0) {
    parts.push('(None yet - we are just meeting)');
  } else {
    for (const assoc of mindstate.associations) {
      const intensityMarker = assoc.intensity === 'strong' ? '(clear)'
        : assoc.intensity === 'medium' ? ''
        : '(faint)';
      parts.push(`- ${assoc.type} ${intensityMarker}: "${assoc.text}"`);
    }
  }
  parts.push('');

  // Situation
  parts.push(`Situation: ${mindstate.situationSnapshot}`);
  parts.push('---');

  return parts.join('\n');
}

/**
 * Get model pricing info (cached)
 */
async function getModelPricing(modelId: string): Promise<{ prompt: number; completion: number } | undefined> {
  if (!modelPricingCache) {
    modelPricingCache = new Map();
    try {
      const models = await fetchOpenRouterModels();
      for (const model of models) {
        modelPricingCache.set(model.id, model.pricing);
      }
    } catch {
      // Ignore fetch errors - pricing will just not be available
    }
  }
  return modelPricingCache.get(modelId);
}

/**
 * Call the conscious mind via OpenRouter
 * Uses configured model, temperature, and max tokens
 * Supports multimodal content (images) for vision-capable models
 */
export async function callConscious(
  mindstate: Mindstate,
  userMessage: string,
  options: ConsciousOptions = {}
): Promise<ConsciousResponse> {
  // Get config values
  const consciousConfig = getConsciousMindConfig();
  const customPrompts = getCustomPrompts();
  const costTracking = getCostTracking();

  // Get API key from config first, then env
  const openrouterKey = getOpenRouterKey() || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;

  if (!openrouterKey) {
    throw new Error('OPENROUTER_API_KEY not set. Run "zosia config openrouter-key" or add to .env');
  }

  const startTime = Date.now();
  const hasImages = options.images && options.images.length > 0;

  // Select model: auto-switch to vision model if images are attached
  let selectedModel = consciousConfig.model;
  if (hasImages && !isVisionModel(selectedModel)) {
    selectedModel = DEFAULT_VISION_MODEL;
    if (options.debug) {
      console.log(`│ 🖼️ Images detected, switching to vision model: ${selectedModel}`);
    }
  }

  // Build system prompt (use custom if set)
  let systemPrompt = customPrompts?.conscious || I_LAYER_PROMPT;
  systemPrompt += '\n\n' + formatMindstate(mindstate);

  // Build messages (supports both text-only and multimodal)
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt }
  ];

  // If revision pass, include previous response
  if (options.previousResponse && options.instruction) {
    messages.push({ role: 'assistant', content: options.previousResponse });

    const revisionText = `[${options.instruction}]\n\nUser: ${userMessage}`;
    if (hasImages) {
      messages.push({ role: 'user', content: buildMultimodalContent(revisionText, options.images!) });
    } else {
      messages.push({ role: 'user', content: revisionText });
    }
  } else {
    // Build user message (multimodal if images present)
    if (hasImages) {
      messages.push({ role: 'user', content: buildMultimodalContent(userMessage, options.images!) });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }
  }

  if (options.debug) {
    const imageInfo = hasImages ? ` + ${options.images!.length} image(s)` : '';
    console.log(`│ 🧠 Model: ${selectedModel} (temp=${consciousConfig.temperature})${imageInfo}`);
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://brain-garden.io',
      'X-Title': 'Zosia Companion'
    },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      temperature: consciousConfig.temperature,
      max_tokens: consciousConfig.maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const latencyMs = Date.now() - startTime;
  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;

  // Calculate and track cost if cost tracking is enabled
  let costUsd: number | undefined;
  if (costTracking.enabled && (promptTokens || completionTokens)) {
    const pricing = await getModelPricing(selectedModel);
    if (pricing) {
      costUsd = (promptTokens / 1_000_000) * pricing.prompt +
                (completionTokens / 1_000_000) * pricing.completion;
      trackLlmUsage(selectedModel, promptTokens, completionTokens, costUsd);

      if (options.debug) {
        console.log(`│ 💰 Cost: $${costUsd.toFixed(6)} (${promptTokens}+${completionTokens} tokens)`);
      }
    }
  }

  return {
    response: data.choices[0]?.message?.content || '',
    latencyMs,
    promptTokens,
    completionTokens,
    model: selectedModel,
    costUsd
  };
}

/**
 * Call Gemma via OpenRouter (legacy alias)
 * @deprecated Use callConscious instead
 */
export async function callGemma(
  mindstate: Mindstate,
  userMessage: string,
  options: ConsciousOptions = {}
): Promise<ConsciousResponse> {
  return callConscious(mindstate, userMessage, options);
}

/** Options for streaming conscious response */
interface StreamConsciousOptions {
  /** Images to include in the message (for vision-capable models) */
  images?: ImageContent[];
}

/**
 * Stream conscious mind response
 * Uses configured model, temperature, and max tokens
 * Supports multimodal content (images) for vision-capable models
 */
export async function* streamConscious(
  mindstate: Mindstate,
  userMessage: string,
  options: StreamConsciousOptions = {}
): AsyncGenerator<string, void, unknown> {
  // Get config values
  const consciousConfig = getConsciousMindConfig();
  const customPrompts = getCustomPrompts();

  // Get API key from config first, then env
  const openrouterKey = getOpenRouterKey() || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;

  if (!openrouterKey) {
    throw new Error('OPENROUTER_API_KEY not set. Run "zosia config openrouter-key" or add to .env');
  }

  const hasImages = options.images && options.images.length > 0;

  // Select model: auto-switch to vision model if images are attached
  let selectedModel = consciousConfig.model;
  if (hasImages && !isVisionModel(selectedModel)) {
    selectedModel = DEFAULT_VISION_MODEL;
  }

  // Build system prompt (use custom if set)
  let systemPrompt = customPrompts?.conscious || I_LAYER_PROMPT;
  systemPrompt += '\n\n' + formatMindstate(mindstate);

  // Build user message (multimodal if images present)
  const userContent: string | MultimodalContent[] = hasImages
    ? buildMultimodalContent(userMessage, options.images!)
    : userMessage;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://brain-garden.io',
      'X-Title': 'Zosia Companion'
    },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      temperature: consciousConfig.temperature,
      max_tokens: consciousConfig.maxTokens,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    throw new Error(`OpenRouter stream error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

/**
 * Stream Gemma response (legacy alias)
 * @deprecated Use streamConscious instead
 */
export async function* streamGemma(
  mindstate: Mindstate,
  userMessage: string
): AsyncGenerator<string, void, unknown> {
  yield* streamConscious(mindstate, userMessage);
}
