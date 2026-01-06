/**
 * Zosia Orchestrator - Context-First Architecture
 *
 * The We-Layer (Claude) runs FIRST to build rich context,
 * then the I-Layer (smaller model) uses that context to appear more sophisticated.
 *
 * Philosophy: Claude does the thinking, the conscious layer does the talking.
 */

import type { Mindstate, Association, Turn, DebugInfo, ChatOptions } from './types.js';
import { callConscious, streamConscious } from './i-layer.js';
import { retrieveDeeper, persistConversation, getGraphitiStatus } from './we-layer.js';
import { IDENTITY_KERNEL } from './prompts.js';
import { incrementSessionCount } from './config.js';

// Simple in-memory session state (V0)
// Future: Graphiti persistence
const sessions = new Map<string, {
  turns: Turn[];
  lastMindstate: Mindstate;
}>();

/**
 * Context Brief - The rich context packet assembled by We-Layer
 * This is what makes the conscious layer appear more sophisticated
 */
interface ContextBrief {
  // Memory context
  relevantMemories: Association[];
  userPreferences: string[];
  relationshipHistory: string | null;

  // Emotional analysis
  detectedEmotion: string;
  emotionalContext: string;

  // Intent classification
  primaryIntent: 'question' | 'venting' | 'sharing' | 'request' | 'greeting' | 'continuation';
  suggestedApproach: string;

  // Conversational guidance
  topicsToAvoid: string[];
  topicsToExplore: string[];

  // Response hints (not the response itself)
  toneGuidance: string;
  depthGuidance: 'brief' | 'moderate' | 'deep';

  // Processing metadata
  processingTimeMs: number;
}

/**
 * Build initial Mindstate for a turn
 */
function buildMindstate(
  userId: string,
  message: string,
  previousTurns: Turn[] = [],
  contextBrief?: ContextBrief
): Mindstate {
  const lastTurn = previousTurns[previousTurns.length - 1];

  // Derive working memory from recent conversation + context brief
  const workingMemory = {
    lastTopic: lastTurn?.mindstate.workingMemory.lastTopic,
    emotionalBaseline: contextBrief?.detectedEmotion || 'neutral',
    openLoops: [] as string[],
    continuityAnchor: lastTurn?.mindstate.workingMemory.continuityAnchor
  };

  // Build rich situation snapshot using context brief
  let situationSnapshot: string;
  if (contextBrief) {
    situationSnapshot = buildEnrichedSnapshot(contextBrief, previousTurns.length === 0);
  } else {
    situationSnapshot = previousTurns.length === 0
      ? 'A new person is reaching out for the first time.'
      : `Continuing conversation. Last exchange was about ${workingMemory.lastTopic || 'various topics'}.`;
  }

  return {
    identityKernel: IDENTITY_KERNEL,
    workingMemory,
    associations: contextBrief?.relevantMemories || [],
    situationSnapshot
  };
}

/**
 * Build enriched situation snapshot from context brief
 * This is the "secret sauce" that makes the smaller model appear smarter
 */
function buildEnrichedSnapshot(brief: ContextBrief, isNewConversation: boolean): string {
  const parts: string[] = [];

  // Emotional awareness
  if (brief.detectedEmotion !== 'neutral') {
    parts.push(`The person seems ${brief.detectedEmotion}.`);
  }

  // Relationship context
  if (brief.relationshipHistory) {
    parts.push(brief.relationshipHistory);
  } else if (isNewConversation) {
    parts.push('This is a new person reaching out.');
  }

  // Intent understanding
  const intentDescriptions: Record<string, string> = {
    question: 'They have a question they want answered.',
    venting: 'They need to express something and be heard.',
    sharing: 'They want to share something with you.',
    request: 'They have a specific request.',
    greeting: 'They are greeting you.',
    continuation: 'They are continuing an earlier thread.'
  };
  parts.push(intentDescriptions[brief.primaryIntent] || '');

  // Suggested approach
  if (brief.suggestedApproach) {
    parts.push(`Approach: ${brief.suggestedApproach}`);
  }

  // Memory-informed context
  if (brief.userPreferences.length > 0) {
    parts.push(`Remember: ${brief.userPreferences.join('; ')}`);
  }

  // Topics guidance
  if (brief.topicsToExplore.length > 0) {
    parts.push(`Could naturally explore: ${brief.topicsToExplore.join(', ')}`);
  }

  // Tone guidance
  if (brief.toneGuidance) {
    parts.push(`Tone: ${brief.toneGuidance}`);
  }

  return parts.filter(p => p).join(' ');
}

/**
 * Assemble context brief using We-Layer (Claude)
 * This is the "brain" that makes the smaller model appear smarter
 */
async function assembleContextBrief(
  userId: string,
  message: string,
  previousTurns: Turn[],
  debug: boolean
): Promise<ContextBrief> {
  const startTime = Date.now();

  if (debug) {
    console.log('\n┌─ WE-LAYER: ASSEMBLING CONTEXT ────────────────────────┐');
    console.log('│ Phase 1: Retrieving memories...');
  }

  // Phase 1: Retrieve memories from Graphiti
  const weLayerResult = await retrieveDeeper(userId, message, []);

  if (debug) {
    console.log(`│   Found ${weLayerResult.associations.length} associations (${weLayerResult.latencyMs}ms)`);
    console.log('│ Phase 2: Analyzing context...');
  }

  // Phase 2: Analyze the message and context
  const analysis = analyzeMessage(message, previousTurns);

  // Phase 3: Extract user preferences from memories
  const userPreferences = extractUserPreferences(weLayerResult.associations);

  // Phase 4: Build relationship context
  const relationshipHistory = buildRelationshipContext(previousTurns, weLayerResult.associations);

  // Phase 5: Determine response approach
  const approach = determineApproach(analysis.intent, analysis.emotion, previousTurns.length);

  const processingTimeMs = Date.now() - startTime;

  if (debug) {
    console.log(`│ Phase 3: Context assembled in ${processingTimeMs}ms`);
    console.log('│');
    console.log(`│ 📊 Analysis:`);
    console.log(`│   Emotion: ${analysis.emotion}`);
    console.log(`│   Intent: ${analysis.intent}`);
    console.log(`│   Depth: ${approach.depth}`);
    console.log(`│   Tone: ${approach.tone}`);
    if (userPreferences.length > 0) {
      console.log(`│   Preferences: ${userPreferences.join(', ')}`);
    }
    if (weLayerResult.associations.length > 0) {
      console.log('│');
      console.log('│ 🧠 Surfaced Memories:');
      for (const assoc of weLayerResult.associations.slice(0, 3)) {
        console.log(`│   • [${assoc.type}] ${assoc.text.slice(0, 50)}...`);
      }
    }
    console.log('└────────────────────────────────────────────────────────┘');
  }

  return {
    relevantMemories: weLayerResult.associations,
    userPreferences,
    relationshipHistory,
    detectedEmotion: analysis.emotion,
    emotionalContext: analysis.emotionalContext,
    primaryIntent: analysis.intent,
    suggestedApproach: approach.suggestion,
    topicsToAvoid: [],
    topicsToExplore: approach.explorableTopics,
    toneGuidance: approach.tone,
    depthGuidance: approach.depth,
    processingTimeMs
  };
}

/**
 * Analyze message for emotion and intent
 */
function analyzeMessage(message: string, previousTurns: Turn[]): {
  emotion: string;
  emotionalContext: string;
  intent: ContextBrief['primaryIntent'];
} {
  const lowerMessage = message.toLowerCase();

  // Simple emotion detection (future: use Claude for this)
  let emotion = 'neutral';
  let emotionalContext = '';

  if (/\b(sad|upset|hurt|down|depressed|lonely)\b/.test(lowerMessage)) {
    emotion = 'sad';
    emotionalContext = 'They may need support and validation.';
  } else if (/\b(angry|frustrated|annoyed|mad|pissed)\b/.test(lowerMessage)) {
    emotion = 'frustrated';
    emotionalContext = 'They may need to be heard before solutions.';
  } else if (/\b(worried|anxious|scared|nervous|afraid)\b/.test(lowerMessage)) {
    emotion = 'anxious';
    emotionalContext = 'They may need reassurance and grounding.';
  } else if (/\b(happy|excited|great|wonderful|amazing)\b/.test(lowerMessage)) {
    emotion = 'positive';
    emotionalContext = 'They are in good spirits. Match their energy.';
  } else if (/\b(confused|lost|uncertain|unsure)\b/.test(lowerMessage)) {
    emotion = 'confused';
    emotionalContext = 'They need clarity and guidance.';
  }

  // Intent classification
  let intent: ContextBrief['primaryIntent'] = 'sharing';

  if (/\?$/.test(message.trim()) || /^(what|how|why|when|where|who|can|could|would|should|is|are|do|does)\b/i.test(message)) {
    intent = 'question';
  } else if (/^(hi|hey|hello|good morning|good evening)\b/i.test(message)) {
    intent = 'greeting';
  } else if (/\b(please|can you|could you|would you|help|need)\b/i.test(lowerMessage)) {
    intent = 'request';
  } else if (emotion === 'sad' || emotion === 'frustrated' || emotion === 'anxious') {
    intent = 'venting';
  } else if (previousTurns.length > 0) {
    intent = 'continuation';
  }

  return { emotion, emotionalContext, intent };
}

/**
 * Extract user preferences from memory associations
 */
function extractUserPreferences(associations: Association[]): string[] {
  const preferences: string[] = [];

  for (const assoc of associations) {
    if (assoc.type === 'preference' || assoc.type === 'teaching') {
      preferences.push(assoc.text);
    }
  }

  return preferences.slice(0, 3); // Keep it focused
}

/**
 * Build relationship context from history
 */
function buildRelationshipContext(previousTurns: Turn[], associations: Association[]): string | null {
  if (previousTurns.length === 0 && associations.length === 0) {
    return null;
  }

  if (previousTurns.length > 10) {
    return 'This is someone you know well. You have history together.';
  } else if (previousTurns.length > 0) {
    return 'You are getting to know this person.';
  } else if (associations.length > 0) {
    return 'You have memories of this person from before.';
  }

  return null;
}

/**
 * Determine response approach based on analysis
 */
function determineApproach(
  intent: ContextBrief['primaryIntent'],
  emotion: string,
  turnCount: number
): {
  suggestion: string;
  tone: string;
  depth: ContextBrief['depthGuidance'];
  explorableTopics: string[];
} {
  let suggestion = '';
  let tone = 'warm and present';
  let depth: ContextBrief['depthGuidance'] = 'moderate';
  const explorableTopics: string[] = [];

  switch (intent) {
    case 'greeting':
      suggestion = 'Acknowledge warmly. Keep it light but genuine.';
      depth = 'brief';
      break;
    case 'question':
      suggestion = 'Answer thoughtfully. Draw on what you know about them.';
      depth = 'moderate';
      break;
    case 'venting':
      suggestion = 'Listen first. Validate their feelings before offering perspective.';
      tone = 'gentle and supportive';
      depth = 'deep';
      break;
    case 'request':
      suggestion = 'Be helpful but stay within your nature.';
      depth = 'moderate';
      break;
    case 'sharing':
      suggestion = 'Engage with genuine curiosity. Ask follow-ups.';
      explorableTopics.push('what this means to them');
      depth = 'moderate';
      break;
    case 'continuation':
      suggestion = 'Build on where you left off. Show you remember.';
      depth = 'moderate';
      break;
  }

  // Adjust for emotion
  if (emotion === 'anxious' || emotion === 'sad') {
    tone = 'gentle, grounding, and supportive';
    depth = 'deep';
  } else if (emotion === 'positive') {
    tone = 'warm and matching their energy';
  }

  return { suggestion, tone, depth, explorableTopics };
}

/**
 * Main chat function - Context-First Architecture
 *
 * Flow:
 * 1. We-Layer runs FIRST → assembles rich context
 * 2. I-Layer receives context → responds naturally
 *
 * This is the key: Claude does the thinking, the conscious layer does the talking.
 */
export async function chat(
  message: string,
  options: ChatOptions
): Promise<Turn> {
  const { userId, debug } = options;
  const turnId = `turn_${Date.now()}`;

  // Get or create session
  let session = sessions.get(userId);
  if (!session) {
    session = { turns: [], lastMindstate: buildMindstate(userId, message) };
    sessions.set(userId, session);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: WE-LAYER RUNS FIRST
  // The unconscious assembles rich context before the conscious speaks
  // ═══════════════════════════════════════════════════════════════════

  const contextBrief = await assembleContextBrief(userId, message, session.turns, debug ?? false);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: BUILD ENRICHED MINDSTATE
  // The context brief becomes the foundation for the conscious response
  // ═══════════════════════════════════════════════════════════════════

  const mindstate = buildMindstate(userId, message, session.turns, contextBrief);

  if (debug) {
    console.log('\n┌─ ENRICHED MINDSTATE ──────────────────────────────────┐');
    console.log(`│ User: ${userId}`);
    console.log(`│ Emotion: ${contextBrief.detectedEmotion}`);
    console.log(`│ Intent: ${contextBrief.primaryIntent}`);
    console.log(`│ Associations: ${mindstate.associations.length}`);
    console.log(`│ Depth: ${contextBrief.depthGuidance}`);
    console.log('│');
    console.log(`│ 📝 Situation: ${mindstate.situationSnapshot.slice(0, 100)}...`);
    console.log('└────────────────────────────────────────────────────────┘');
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: I-LAYER RESPONDS WITH PRE-ASSEMBLED CONTEXT
  // The conscious layer just needs to "speak" - the thinking is done
  // ═══════════════════════════════════════════════════════════════════

  if (debug) {
    console.log('\n┌─ I-LAYER: RESPONDING ─────────────────────────────────┐');
  }

  const iLayerResult = await callConscious(mindstate, message, { debug, images: options.images });

  if (debug) {
    console.log(`│ Model: ${iLayerResult.model}`);
    console.log(`│ Latency: ${iLayerResult.latencyMs}ms`);
    if (iLayerResult.promptTokens) {
      console.log(`│ Tokens: ${iLayerResult.promptTokens} in / ${iLayerResult.completionTokens} out`);
    }
    if (iLayerResult.costUsd !== undefined) {
      console.log(`│ Cost: $${iLayerResult.costUsd.toFixed(6)}`);
    }
    console.log('└────────────────────────────────────────────────────────┘');
  }

  const finalResponse = iLayerResult.response;
  const finalMindstate = mindstate;

  // Increment session count for cost tracking
  incrementSessionCount();

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 4: BUILD DEBUG INFO
  // Reflects the context-first architecture
  // ═══════════════════════════════════════════════════════════════════

  const debugInfo: DebugInfo = {
    iLayer: {
      model: iLayerResult.model,
      latencyMs: iLayerResult.latencyMs,
      promptTokens: iLayerResult.promptTokens,
      completionTokens: iLayerResult.completionTokens
    },
    weLayer: {
      activated: true, // Always runs first now
      graphitiQueries: 1, // Context assembly always queries
      associationsDistilled: contextBrief.relevantMemories.length,
      latencyMs: contextBrief.processingTimeMs
    },
    contextBrief: {
      emotion: contextBrief.detectedEmotion,
      intent: contextBrief.primaryIntent,
      depth: contextBrief.depthGuidance,
      memoriesUsed: contextBrief.relevantMemories.length,
      processingTimeMs: contextBrief.processingTimeMs
    },
    mindstateVersion: session.turns.length + 1
  };

  // Create turn record
  const turn: Turn = {
    turnId,
    userId,
    timestamp: new Date(),
    userMessage: message,
    response: finalResponse,
    mindstate: finalMindstate,
    debug: debug ? debugInfo : undefined
  };

  // Update session
  session.turns.push(turn);
  session.lastMindstate = finalMindstate;

  // Update working memory for next turn
  finalMindstate.workingMemory.lastTopic = extractTopic(message);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 5: PERSIST TO MEMORY (NON-BLOCKING)
  // ═══════════════════════════════════════════════════════════════════

  persistConversation(userId, message, finalResponse, debug).catch((err) => {
    if (debug) {
      console.log(`│ ⚠️ Memory persistence failed: ${err.message}`);
    }
  });

  if (debug) {
    console.log('\n┌─ TURN COMPLETE ───────────────────────────────────────┐');
    console.log(`│ Total latency: ${contextBrief.processingTimeMs + iLayerResult.latencyMs}ms`);
    console.log(`│   • Context assembly: ${contextBrief.processingTimeMs}ms`);
    console.log(`│   • Response generation: ${iLayerResult.latencyMs}ms`);
    console.log('└────────────────────────────────────────────────────────┘');
  }

  return turn;
}

/** Event types for streaming responses */
export type StreamEvent =
  | { type: 'phase'; phase: 'receiving' | 'unconscious' | 'integrating' | 'conscious' | 'responding' | 'remembering' }
  | { type: 'context'; data: { emotion: string; intent: string; depth: string; memories: number } }
  | { type: 'token'; content: string }
  | { type: 'done'; turn: Turn }
  | { type: 'error'; error: string };

/**
 * Streaming chat function - Context-First Architecture with SSE
 *
 * Yields events as they happen:
 * - Phase transitions (for UI updates)
 * - Context brief data (when We-Layer completes)
 * - Token chunks (as I-Layer streams response)
 * - Done (with final Turn object)
 */
export async function* chatStream(
  message: string,
  options: ChatOptions
): AsyncGenerator<StreamEvent, void, unknown> {
  const { userId, debug } = options;
  const turnId = `turn_${Date.now()}`;

  // Get or create session
  let session = sessions.get(userId);
  if (!session) {
    session = { turns: [], lastMindstate: buildMindstate(userId, message) };
    sessions.set(userId, session);
  }

  // Phase: Receiving
  yield { type: 'phase', phase: 'receiving' };

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: WE-LAYER RUNS FIRST (Unconscious)
  // ═══════════════════════════════════════════════════════════════════
  yield { type: 'phase', phase: 'unconscious' };

  const contextBrief = await assembleContextBrief(userId, message, session.turns, debug ?? false);

  // Emit context brief data
  yield {
    type: 'context',
    data: {
      emotion: contextBrief.detectedEmotion,
      intent: contextBrief.primaryIntent,
      depth: contextBrief.depthGuidance,
      memories: contextBrief.relevantMemories.length,
    },
  };

  // Phase: Integrating
  yield { type: 'phase', phase: 'integrating' };

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: BUILD ENRICHED MINDSTATE
  // ═══════════════════════════════════════════════════════════════════
  const mindstate = buildMindstate(userId, message, session.turns, contextBrief);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: I-LAYER STREAMS RESPONSE (Conscious)
  // ═══════════════════════════════════════════════════════════════════
  yield { type: 'phase', phase: 'conscious' };

  const startTime = Date.now();
  let fullResponse = '';

  try {
    for await (const chunk of streamConscious(mindstate, message, { images: options.images })) {
      fullResponse += chunk;
      yield { type: 'token', content: chunk };
    }
  } catch (error) {
    yield { type: 'error', error: error instanceof Error ? error.message : 'Stream error' };
    return;
  }

  const latencyMs = Date.now() - startTime;

  // Phase: Responding (all tokens received)
  yield { type: 'phase', phase: 'responding' };

  // Increment session count for cost tracking
  incrementSessionCount();

  // Build debug info
  const debugInfo: DebugInfo = {
    iLayer: {
      model: 'configured-model', // TODO: get from config
      latencyMs,
    },
    weLayer: {
      activated: true,
      associationsDistilled: contextBrief.relevantMemories.length,
      latencyMs: contextBrief.processingTimeMs,
    },
    contextBrief: {
      emotion: contextBrief.detectedEmotion,
      intent: contextBrief.primaryIntent,
      depth: contextBrief.depthGuidance,
      memoriesUsed: contextBrief.relevantMemories.length,
      processingTimeMs: contextBrief.processingTimeMs,
    },
    mindstateVersion: session.turns.length + 1,
  };

  // Create turn record
  const turn: Turn = {
    turnId,
    userId,
    timestamp: new Date(),
    userMessage: message,
    response: fullResponse,
    mindstate,
    debug: debug ? debugInfo : undefined,
  };

  // Update session
  session.turns.push(turn);
  session.lastMindstate = mindstate;
  mindstate.workingMemory.lastTopic = extractTopic(message);

  // Phase: Remembering (persisting)
  yield { type: 'phase', phase: 'remembering' };

  // Persist (non-blocking)
  persistConversation(userId, message, fullResponse, debug).catch(() => {});

  // Done
  yield { type: 'done', turn };
}

/**
 * Simple topic extraction (V0)
 * Future: Use NLP or Claude for better extraction
 */
function extractTopic(message: string): string {
  // Just take first few words as topic indicator
  const words = message.split(' ').slice(0, 5);
  return words.join(' ') + (message.split(' ').length > 5 ? '...' : '');
}

/**
 * Get session history for a user
 */
export function getSession(userId: string) {
  return sessions.get(userId);
}

/**
 * Clear session for testing
 */
export function clearSession(userId: string) {
  sessions.delete(userId);
}
