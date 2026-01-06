/**
 * We-Layer: The Subconscious Orchestrator (Claude Code)
 *
 * V1: Graphiti memory + pattern matching fallback
 * Future: Pre-warmed agent pool from @brain-garden/agent-pool
 *
 * ARCHITECTURE VISION:
 *
 * THE GENERAL (Root - minimal context, persistent)
 *     ↓
 * COMMANDERS (Domain leaders - moderate context)
 *   • Memory Commander - retrieval, distillation
 *   • Curiosity Commander - proactive questions
 *   • Self-Ledger Commander - promises, preferences
 *   • Quality Commander - response review
 *     ↓
 * SPECIALISTS (Workers - full context)
 *   • Query agents, Distill agents, Research agents, etc.
 */

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { Association } from './types.js';
import {
  checkGraphitiHealth,
  searchMemories,
  factsToAssociations,
  storeConversation,
} from './graphiti-memory.js';
import {
  getUnconsciousSpawner,
  type UnconsciousSpawnerConfig,
  type MemoryRetrievalResult,
  type EmotionClassificationResult,
  type IntentRecognitionResult,
} from './unconscious-spawner.js';

// ============================================================================
// Claude Code Authentication Detection
// ============================================================================

export type ClaudeCodeMode = 'max' | 'api' | 'none';

export interface ClaudeCodeStatus {
  authenticated: boolean;
  mode: ClaudeCodeMode;
  email?: string;
  expiresAt?: string;
  error?: string;
}

// Claude Code credentials path
const CLAUDE_CREDENTIALS_PATH = join(homedir(), '.claude', 'credentials.json');
const CLAUDE_CONFIG_PATH = join(homedir(), '.claude', 'config.json');

// Cached Claude Code status
let claudeCodeStatus: ClaudeCodeStatus | null = null;

/**
 * Detect Claude Code authentication status
 * Checks for browser auth (max mode) or API key (api mode)
 */
export function detectClaudeCodeAuth(): ClaudeCodeStatus {
  // Return cached status if available
  if (claudeCodeStatus) {
    return claudeCodeStatus;
  }

  // Check for browser authentication (max mode)
  if (existsSync(CLAUDE_CREDENTIALS_PATH)) {
    try {
      const credsRaw = readFileSync(CLAUDE_CREDENTIALS_PATH, 'utf-8');
      const creds = JSON.parse(credsRaw) as {
        accessToken?: string;
        refreshToken?: string;
        email?: string;
        expiresAt?: string;
        userId?: string;
      };

      if (creds.accessToken) {
        // Check if token is expired
        const isExpired = creds.expiresAt && new Date(creds.expiresAt) < new Date();

        if (!isExpired) {
          claudeCodeStatus = {
            authenticated: true,
            mode: 'max',
            email: creds.email,
            expiresAt: creds.expiresAt,
          };
          return claudeCodeStatus;
        } else {
          claudeCodeStatus = {
            authenticated: false,
            mode: 'none',
            error: 'Claude Code session expired. Run "claude login" to re-authenticate.',
          };
          return claudeCodeStatus;
        }
      }
    } catch (err) {
      // Credentials file exists but couldn't be parsed
      claudeCodeStatus = {
        authenticated: false,
        mode: 'none',
        error: `Failed to parse Claude credentials: ${err instanceof Error ? err.message : 'unknown error'}`,
      };
      return claudeCodeStatus;
    }
  }

  // Check for API key authentication (api mode)
  if (process.env.ANTHROPIC_API_KEY) {
    claudeCodeStatus = {
      authenticated: true,
      mode: 'api',
    };
    return claudeCodeStatus;
  }

  // No authentication found
  claudeCodeStatus = {
    authenticated: false,
    mode: 'none',
    error: 'Claude Code not authenticated. Run "claude login" or set ANTHROPIC_API_KEY.',
  };
  return claudeCodeStatus;
}

/**
 * Force refresh of Claude Code status (call after login/logout)
 */
export function refreshClaudeCodeStatus(): ClaudeCodeStatus {
  claudeCodeStatus = null;
  return detectClaudeCodeAuth();
}

/**
 * Check if Claude Code can be used for unconscious processing
 */
export function isClaudeCodeAvailable(): boolean {
  const status = detectClaudeCodeAuth();
  return status.authenticated;
}

/**
 * Get Claude Code status summary for display
 */
export function getClaudeCodeStatusSummary(): string {
  const status = detectClaudeCodeAuth();

  if (!status.authenticated) {
    return `❌ Claude Code: Not authenticated (${status.error || 'unknown'})`;
  }

  if (status.mode === 'max') {
    const emailPart = status.email ? ` (${status.email})` : '';
    const expiryPart = status.expiresAt
      ? ` - expires ${new Date(status.expiresAt).toLocaleDateString()}`
      : '';
    return `✓ Claude Code: Max Mode${emailPart}${expiryPart}`;
  }

  return '✓ Claude Code: API Mode (ANTHROPIC_API_KEY)';
}

// ============================================================================
// Graphiti & Retrieval
// ============================================================================

interface RetrievalResult {
  associations: Association[];
  latencyMs: number;
  queriesRun?: number;
  source: 'graphiti' | 'pattern' | 'none';
}

// Graphiti health state
let graphitiHealthy = false;
let graphitiLatencyMs = 0;

// Deep unconscious mode (uses Claude Code parallel agents)
let deepUnconsciousEnabled = false;
let unconsciousConfig: Partial<UnconsciousSpawnerConfig> = {};

export interface WeLayerInitOptions {
  debug?: boolean;
  enableDeepUnconscious?: boolean;
  unconsciousConfig?: Partial<UnconsciousSpawnerConfig>;
}

/**
 * Initialize We-layer - check Claude Code auth and Graphiti health
 */
export async function initWeLayerPool(options: WeLayerInitOptions | boolean = false): Promise<void> {
  // Handle legacy boolean argument
  const opts: WeLayerInitOptions = typeof options === 'boolean'
    ? { debug: options }
    : options;

  const { debug = false, enableDeepUnconscious = false, unconsciousConfig: config } = opts;

  if (debug) {
    console.log('\n┌─ WE-LAYER INIT (Unconscious) ────────────────────────┐');
  }

  // Detect Claude Code authentication
  const claudeStatus = detectClaudeCodeAuth();

  if (debug) {
    if (claudeStatus.authenticated) {
      const modeIcon = claudeStatus.mode === 'max' ? '👤' : '🔑';
      const modeLabel = claudeStatus.mode === 'max' ? 'Max Mode' : 'API Mode';
      const emailPart = claudeStatus.email ? ` (${claudeStatus.email})` : '';
      console.log(`│ ${modeIcon} Claude Code: ${modeLabel}${emailPart}`);

      if (claudeStatus.mode === 'max' && claudeStatus.expiresAt) {
        const expiry = new Date(claudeStatus.expiresAt);
        const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7) {
          console.log(`│ ⚠️  Session expires in ${daysLeft} days`);
        }
      }
    } else {
      console.log('│ ⚠️  Claude Code: Not authenticated');
      console.log(`│    ${claudeStatus.error || 'Run "claude login" to enable unconscious layer'}`);
    }
  }

  // Enable deep unconscious if requested and Claude Code is available
  if (enableDeepUnconscious && claudeStatus.authenticated) {
    deepUnconsciousEnabled = true;
    unconsciousConfig = { ...config, debug };

    if (debug) {
      console.log('│ ');
      console.log('│ 🧬 Deep Unconscious: ENABLED (parallel agent processing)');
    }
  }

  // Check Graphiti health
  const health = await checkGraphitiHealth();
  graphitiHealthy = health.healthy;
  graphitiLatencyMs = health.latencyMs;

  if (debug) {
    console.log('│ ');
    if (graphitiHealthy) {
      console.log(`│ 🧠 Graphiti connected (${graphitiLatencyMs}ms)`);
      console.log('│ 📡 Memory retrieval: ENABLED');
    } else {
      console.log('│ ⚠️  Graphiti unavailable - using pattern fallback');
      console.log('│ 🔍 Pattern matching: ENABLED');
    }
    console.log('└───────────────────────────────────────────────────────┘');
  }
}

/**
 * Shutdown placeholder
 */
export async function shutdownWeLayerPool(): Promise<void> {
  // Nothing to shutdown in V1
}

/**
 * We-layer retrieval - Uses Graphiti with pattern fallback
 */
export async function retrieveDeeper(
  userId: string,
  message: string,
  existingAssociations: Association[] = []
): Promise<RetrievalResult> {
  const startTime = Date.now();
  const debug = process.env.ZOSIA_DEBUG === 'true';

  // Skip if already have associations
  if (existingAssociations.length >= 3) {
    return {
      associations: [],
      latencyMs: Date.now() - startTime,
      queriesRun: 0,
      source: 'none',
    };
  }

  if (debug) {
    console.log('\n┌─ WE-LAYER PROCESSING ─────────────────────────────┐');
    console.log(`│ 🧠 Input: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`);
    console.log(`│ 👤 User: ${userId}`);
    console.log('│ ');
  }

  let associations: Association[] = [];
  let source: 'graphiti' | 'pattern' | 'none' = 'none';
  let queriesRun = 0;

  // Try Graphiti first if healthy
  if (graphitiHealthy) {
    if (debug) {
      console.log('│ 🔍 QUERYING GRAPHITI MEMORY...');
    }

    const result = await searchMemories(userId, message, { maxFacts: 5, debug });
    queriesRun = 1;

    if (result.facts.length > 0) {
      associations = factsToAssociations(result.facts);
      source = 'graphiti';

      if (debug) {
        console.log(`│ ✓ Retrieved ${result.facts.length} memories from Graphiti`);
      }
    } else if (debug) {
      console.log('│ (No memories found - trying pattern fallback)');
    }
  }

  // Pattern matching fallback
  if (associations.length === 0) {
    if (debug) {
      console.log('│ 🔍 PATTERN MATCHING...');
    }

    const patternAssociations = runPatternMatching(message, debug);
    if (patternAssociations.length > 0) {
      associations = patternAssociations;
      source = 'pattern';
    }
  }

  // Limit to 3 associations
  const finalAssociations = associations.slice(0, 3);

  if (debug) {
    console.log('│ ');
    if (finalAssociations.length > 0) {
      console.log(`│ 💭 ASSOCIATIONS (${source.toUpperCase()}):`);
      for (const a of finalAssociations) {
        const sourceTag = a.source === 'graphiti' ? '📚' : '🔍';
        console.log(`│   ${sourceTag} [${a.type}|${a.intensity}] ${a.text.slice(0, 40)}...`);
      }
    } else {
      console.log('│ (No associations - responding fresh)');
    }
    console.log(`│ `);
    console.log(`│ ⏱️ Processing time: ${Date.now() - startTime}ms`);
    console.log('└────────────────────────────────────────────────────┘');
  }

  return {
    associations: finalAssociations,
    latencyMs: Date.now() - startTime,
    queriesRun,
    source,
  };
}

/**
 * Pattern matching for associations (fallback when Graphiti unavailable)
 */
function runPatternMatching(message: string, debug: boolean): Association[] {
  const associations: Association[] = [];
  const lowerMessage = message.toLowerCase();

  // Pattern: Meaning/Purpose
  if (lowerMessage.includes('meaningful') || lowerMessage.includes('purpose') || lowerMessage.includes('meaning')) {
    associations.push({
      type: 'HUNCH',
      intensity: 'medium',
      text: 'Something about searching for meaning surfaces... there may be past conversations about purpose here.',
      source: 'pattern',
    });
    if (debug) console.log(`│   ✓ Pattern: meaning/purpose → HUNCH|medium`);
  }

  // Pattern: Projects/Building
  if (lowerMessage.includes('project') || lowerMessage.includes('build') || lowerMessage.includes('create')) {
    associations.push({
      type: 'PULL',
      intensity: 'faint',
      text: 'I find myself curious about what they want to create...',
      source: 'pattern',
    });
    if (debug) console.log(`│   ✓ Pattern: project/build → PULL|faint`);
  }

  // Pattern: Identity (Dave/Ben)
  if (lowerMessage.includes('dave') || lowerMessage.includes('ben')) {
    const name = lowerMessage.includes('dave') ? 'Dave' : 'Ben';
    associations.push({
      type: 'RECALL',
      intensity: 'strong',
      text: `This is ${name}. Their name carries weight. I should remember our history.`,
      source: 'pattern',
    });
    if (debug) console.log(`│   ✓ Pattern: identity (${name}) → RECALL|strong`);
  }

  // Pattern: Frustration/Struggle
  if (lowerMessage.includes('frustrat') || lowerMessage.includes('stuck') || lowerMessage.includes('hard') || lowerMessage.includes('difficult')) {
    associations.push({
      type: 'SIGN',
      intensity: 'medium',
      text: 'There may be emotional weight here that needs acknowledgment...',
      source: 'pattern',
    });
    if (debug) console.log(`│   ✓ Pattern: struggle → SIGN|medium`);
  }

  // Pattern: Questions about Zosia/AI
  if (lowerMessage.includes('you') && (lowerMessage.includes('think') || lowerMessage.includes('feel') || lowerMessage.includes('remember'))) {
    associations.push({
      type: 'PULL',
      intensity: 'medium',
      text: 'They are asking about my inner experience... this is a chance for genuine connection.',
      source: 'pattern',
    });
    if (debug) console.log(`│   ✓ Pattern: inner experience → PULL|medium`);
  }

  return associations;
}

/**
 * Store conversation turn in Graphiti (called after response)
 */
export async function persistConversation(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  debug = false
): Promise<void> {
  if (!graphitiHealthy) {
    if (debug) {
      console.log('\n│ ⚠️ Graphiti unavailable - conversation not persisted');
    }
    return;
  }

  if (debug) {
    console.log('\n┌─ PERSISTING MEMORY ──────────────────────────────┐');
  }

  await storeConversation(userId, userMessage, assistantResponse, { debug });

  if (debug) {
    console.log('└───────────────────────────────────────────────────┘');
  }
}

/**
 * Get Graphiti connection status (with live check if not initialized)
 */
export async function getGraphitiStatusAsync(): Promise<{ healthy: boolean; latencyMs: number }> {
  // If we already checked and it's healthy, return cached
  if (graphitiHealthy) {
    return { healthy: graphitiHealthy, latencyMs: graphitiLatencyMs };
  }

  // Otherwise do a live check
  const health = await checkGraphitiHealth();
  graphitiHealthy = health.healthy;
  graphitiLatencyMs = health.latencyMs;
  return { healthy: graphitiHealthy, latencyMs: graphitiLatencyMs };
}

/**
 * Get Graphiti connection status (sync - returns cached value)
 */
export function getGraphitiStatus(): { healthy: boolean; latencyMs: number } {
  return { healthy: graphitiHealthy, latencyMs: graphitiLatencyMs };
}

/**
 * FUTURE: The General - Root orchestrator
 */
export async function theGeneral(
  userId: string,
  message: string,
  _context: { sessionId: string }
): Promise<void> {
  console.log(`[The General] Dispatching for user ${userId}:`, message.slice(0, 50));
}

/**
 * FUTURE: Memory Commander
 */
export async function memoryCommander(
  userId: string,
  message: string
): Promise<Association[]> {
  console.log(`[Memory Commander] Searching for user ${userId}`);
  return [];
}

// ============================================================================
// Deep Unconscious Processing (Parallel Claude Agents)
// ============================================================================

export interface DeepUnconsciousResult {
  memory: MemoryRetrievalResult | null;
  emotion: EmotionClassificationResult | null;
  intent: IntentRecognitionResult | null;
  associations: Association[];
  emotionalContext: {
    primary: string;
    intensity: number;
  } | null;
  latencyMs: number;
}

/**
 * Run deep unconscious processing using parallel Claude Code agents
 *
 * This is the "stronger" unconscious - running multiple specialized agents
 * in parallel to:
 * - Retrieve and synthesize memories
 * - Classify emotional content
 * - Recognize intent and unstated needs
 *
 * Results are combined and distilled for the conscious mind.
 */
export async function runDeepUnconscious(
  userId: string,
  sessionId: string,
  message: string,
  debug = false
): Promise<DeepUnconsciousResult> {
  const startTime = Date.now();

  if (!deepUnconsciousEnabled) {
    // Fall back to basic processing
    return {
      memory: null,
      emotion: null,
      intent: null,
      associations: [],
      emotionalContext: null,
      latencyMs: Date.now() - startTime,
    };
  }

  if (debug) {
    console.log('\n┌─ DEEP UNCONSCIOUS PROCESSING ───────────────────────┐');
    console.log('│ 🧬 Spawning parallel unconscious agents...');
  }

  const spawner = getUnconsciousSpawner(unconsciousConfig);

  // Run the full processing sweep
  const result = await spawner.processSweep(userId, sessionId, message, {
    includeInsights: false, // Insights are slower, skip for now
  });

  // Convert memory results to associations
  const associations: Association[] = [];

  if (result.memory?.associations) {
    for (const assoc of result.memory.associations) {
      associations.push({
        type: assoc.type,
        intensity: assoc.intensity,
        text: assoc.text,
        source: assoc.source,
      });
    }
  }

  // Add emotion-derived association if strong emotion detected
  if (result.emotion && result.emotion.intensity > 0.6) {
    associations.push({
      type: 'SIGN',
      intensity: result.emotion.intensity > 0.8 ? 'strong' : 'medium',
      text: `Strong ${result.emotion.primary} detected. Secondary: ${result.emotion.secondary.join(', ')}`,
      source: 'inference',
    });
  }

  // Add intent-derived association if unmet needs detected
  if (result.intent && result.intent.needs.length > 0) {
    associations.push({
      type: 'PULL',
      intensity: result.intent.confidence > 0.7 ? 'medium' : 'faint',
      text: `Unstated needs: ${result.intent.needs.slice(0, 2).join('; ')}`,
      source: 'inference',
    });
  }

  if (debug) {
    console.log(`│ `);
    console.log(`│ 📊 Results:`);
    if (result.memory) {
      console.log(`│   Memory: ${result.memory.associations.length} associations`);
    }
    if (result.emotion) {
      console.log(`│   Emotion: ${result.emotion.primary} (${(result.emotion.intensity * 100).toFixed(0)}%)`);
    }
    if (result.intent) {
      console.log(`│   Intent: ${result.intent.primary_intent}`);
    }
    console.log(`│ `);
    console.log(`│ ⏱️ Total: ${result.totalLatencyMs}ms`);
    console.log('└───────────────────────────────────────────────────────┘');
  }

  return {
    memory: result.memory,
    emotion: result.emotion,
    intent: result.intent,
    associations: associations.slice(0, 5), // Limit to 5 associations
    emotionalContext: result.emotion ? {
      primary: result.emotion.primary,
      intensity: result.emotion.intensity,
    } : null,
    latencyMs: result.totalLatencyMs,
  };
}

/**
 * Check if deep unconscious is enabled
 */
export function isDeepUnconsciousEnabled(): boolean {
  return deepUnconsciousEnabled;
}

/**
 * Enable/disable deep unconscious mode at runtime
 */
export function setDeepUnconsciousMode(enabled: boolean, config?: Partial<UnconsciousSpawnerConfig>): void {
  const status = detectClaudeCodeAuth();
  if (enabled && !status.authenticated) {
    throw new Error('Cannot enable deep unconscious - Claude Code not authenticated');
  }
  deepUnconsciousEnabled = enabled;
  if (config) {
    unconsciousConfig = config;
  }
}
