/**
 * Context Handoff Module
 *
 * Handles context window handoff when approaching capacity.
 * The handoff creates a compressed summary via the unconscious mind,
 * preserving essential context while freeing token space.
 *
 * The handoff feels like "remembering" - not a data dump.
 */

import {
  getHandoffSettings,
  setHandoffPrompt as configSetHandoffPrompt,
  clearHandoffPrompt as configClearHandoffPrompt,
  setHandoffThreshold as configSetHandoffThreshold,
  getOpenRouterKey,
  getConsciousMindConfig,
  getCostTracking,
  trackLlmUsage,
  type HandoffSettings,
} from './config.js';

/** Default prompt for creating handoff summaries */
export const DEFAULT_HANDOFF_PROMPT = `You are the unconscious mind, creating a rich memory of this conversation.

Remember what matters most - not every word, but the essence:

**Emotional State**: {{emotion}}
What is the user feeling? Excited, frustrated, curious, stuck? Carry this forward.

**Current Topic**: {{topic}}
What are we really talking about? The theme beneath the specifics.

**What We've Decided**:
Any conclusions, agreements, or decisions made together.

**Key Moments**:
The turning points, insights, or breakthroughs worth preserving.

**Conversation So Far**:
{{messages}}

---

Create a natural, flowing summary that feels like remembering a conversation with a friend.
Not bullet points. Not a data dump. A rich, organic recollection that preserves:
- The emotional undertone
- The subject matter we explored
- Any decisions or agreements
- The relationship dynamic

Write in first person plural ("We discussed...", "We realized...").
Keep it concise but complete - this memory will guide our continued conversation.`;

/** Configuration for context handoff behavior */
export interface HandoffConfig {
  /** The prompt used to generate handoff summaries */
  prompt: string;
  /** Context percentage threshold that triggers handoff (0-100) */
  threshold: number;
  /** Whether handoff is enabled */
  enabled: boolean;
}

/** Result of creating a handoff summary */
export interface HandoffResult {
  /** The compressed summary text */
  summary: string;
  /** Number of tokens saved by compression */
  tokensSaved: number;
  /** Essential context preserved from the conversation */
  preservedContext: {
    /** Last detected emotional state */
    lastEmotion: string;
    /** Last active topic */
    lastTopic: string;
    /** Key points extracted */
    keyPoints: string[];
  };
}

/** Context provided for creating a handoff summary */
export interface ConversationContext {
  /** Conversation messages */
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  /** Current emotional state of the conversation */
  currentEmotion: string;
  /** Current topic being discussed */
  currentTopic: string;
  /** Current token count */
  tokenCount: number;
}

// In-memory cache (synced with config file)
let cachedPrompt: string | undefined;
let cacheInitialized = false;

/**
 * Initialize cache from config (called lazily)
 */
function ensureCacheInitialized(): void {
  if (!cacheInitialized) {
    const settings = getHandoffSettings();
    cachedPrompt = settings.prompt;
    cacheInitialized = true;
  }
}

/**
 * Get the current handoff configuration
 */
export function getHandoffConfig(): HandoffConfig {
  ensureCacheInitialized();
  const settings = getHandoffSettings();

  return {
    prompt: cachedPrompt ?? DEFAULT_HANDOFF_PROMPT,
    threshold: settings.threshold,
    enabled: settings.enabled,
  };
}

/**
 * Set a custom handoff prompt
 * Persists to config file for cross-session persistence
 */
export async function setHandoffPrompt(prompt: string): Promise<void> {
  cachedPrompt = prompt;
  cacheInitialized = true;
  await configSetHandoffPrompt(prompt);
}

/**
 * Reset the handoff prompt to the default
 * Clears from config file to use default
 */
export async function resetHandoffPrompt(): Promise<void> {
  cachedPrompt = undefined;
  cacheInitialized = true;
  await configClearHandoffPrompt();
}

/**
 * Set the handoff threshold (percentage of context that triggers handoff)
 * Persists to config file
 */
export async function setHandoffThreshold(threshold: number): Promise<void> {
  await configSetHandoffThreshold(threshold);
}

/**
 * Check if handoff should be triggered based on context usage
 *
 * @param contextPercent - Current context usage percentage (0-100)
 * @param threshold - Optional threshold override (uses config if not provided)
 * @returns true if handoff should be triggered
 */
export function shouldTriggerHandoff(
  contextPercent: number,
  threshold?: number
): boolean {
  const config = getHandoffConfig();
  const effectiveThreshold = threshold ?? config.threshold;
  return contextPercent >= effectiveThreshold;
}

/**
 * Create a handoff summary from the current conversation context
 *
 * This compresses the conversation while preserving essential context:
 * - Emotional state
 * - Current topic
 * - Key decisions and insights
 *
 * @param context - The conversation context to summarize
 * @returns HandoffResult with summary and preserved context
 */
export async function createHandoffSummary(
  context: ConversationContext
): Promise<HandoffResult> {
  const config = getHandoffConfig();

  // Format messages for the prompt
  const formattedMessages = context.messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  // Build the prompt with template variables replaced
  const systemPrompt = config.prompt
    .replace('{{messages}}', formattedMessages)
    .replace('{{emotion}}', context.currentEmotion)
    .replace('{{topic}}', context.currentTopic);

  // Call LLM to generate summary
  let summary: string;
  let summaryTokens = 0;

  try {
    const llmResult = await callLlmForSummary(systemPrompt);
    summary = llmResult.response;
    summaryTokens = llmResult.completionTokens;
  } catch (error) {
    // Fallback to simple summary if LLM call fails
    console.warn('LLM call failed for handoff, using fallback:', error);
    summary = createSimpleSummary(context);
    summaryTokens = Math.ceil(summary.length / 4);
  }

  // Calculate tokens saved
  const originalTokens = context.tokenCount;
  const tokensSaved = Math.max(0, originalTokens - summaryTokens);

  // Extract key points from messages
  const keyPoints = extractKeyPoints(context.messages);

  return {
    summary,
    tokensSaved,
    preservedContext: {
      lastEmotion: context.currentEmotion,
      lastTopic: context.currentTopic,
      keyPoints,
    },
  };
}

/**
 * Call the LLM to generate a handoff summary
 */
async function callLlmForSummary(systemPrompt: string): Promise<{
  response: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const openrouterKey = getOpenRouterKey();
  if (!openrouterKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const consciousConfig = getConsciousMindConfig();
  const costTracking = getCostTracking();

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Create the memory summary now.' },
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://brain-garden.io',
      'X-Title': 'Zosia Companion - Handoff',
    },
    body: JSON.stringify({
      model: consciousConfig.model,
      messages,
      temperature: 0.7, // Slightly creative for natural summarization
      max_tokens: 500, // Keep summaries concise
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;

  // Track cost if enabled
  if (costTracking.enabled && (promptTokens || completionTokens)) {
    // Use a rough estimate for cost tracking
    const estimatedCost = (promptTokens + completionTokens) * 0.000001;
    trackLlmUsage(consciousConfig.model, promptTokens, completionTokens, estimatedCost);
  }

  return {
    response: data.choices[0]?.message?.content || '',
    promptTokens,
    completionTokens,
  };
}

/**
 * Create a simple summary of the conversation
 * In production, this would call the LLM with the handoff prompt
 */
function createSimpleSummary(context: ConversationContext): string {
  const messageCount = context.messages.length;
  const topic = context.currentTopic;
  const emotion = context.currentEmotion;

  return `We had a ${emotion} conversation about ${topic}. ` +
    `Over ${messageCount} exchanges, we explored the topic together. ` +
    `The emotional tone was ${emotion} throughout.`;
}

/**
 * Extract key points from conversation messages
 */
function extractKeyPoints(
  messages: Array<{ role: string; content: string }>
): string[] {
  // Simple extraction: take first sentence of each assistant message
  return messages
    .filter((msg) => msg.role === 'assistant')
    .map((msg) => {
      const firstSentence = msg.content.split(/[.!?]/)[0];
      return firstSentence?.trim() || '';
    })
    .filter((point) => point.length > 0)
    .slice(0, 5); // Keep top 5 key points
}
