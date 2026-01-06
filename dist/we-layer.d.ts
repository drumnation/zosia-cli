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
import type { Association } from './types.js';
import { type UnconsciousSpawnerConfig, type MemoryRetrievalResult, type EmotionClassificationResult, type IntentRecognitionResult } from './unconscious-spawner.js';
export type ClaudeCodeMode = 'max' | 'api' | 'none';
export interface ClaudeCodeStatus {
    authenticated: boolean;
    mode: ClaudeCodeMode;
    email?: string;
    expiresAt?: string;
    error?: string;
}
/**
 * Detect Claude Code authentication status
 * Checks for browser auth (max mode) or API key (api mode)
 */
export declare function detectClaudeCodeAuth(): ClaudeCodeStatus;
/**
 * Force refresh of Claude Code status (call after login/logout)
 */
export declare function refreshClaudeCodeStatus(): ClaudeCodeStatus;
/**
 * Check if Claude Code can be used for unconscious processing
 */
export declare function isClaudeCodeAvailable(): boolean;
/**
 * Get Claude Code status summary for display
 */
export declare function getClaudeCodeStatusSummary(): string;
interface RetrievalResult {
    associations: Association[];
    latencyMs: number;
    queriesRun?: number;
    source: 'graphiti' | 'pattern' | 'none';
}
export interface WeLayerInitOptions {
    debug?: boolean;
    enableDeepUnconscious?: boolean;
    unconsciousConfig?: Partial<UnconsciousSpawnerConfig>;
}
/**
 * Initialize We-layer - check Claude Code auth and Graphiti health
 */
export declare function initWeLayerPool(options?: WeLayerInitOptions | boolean): Promise<void>;
/**
 * Shutdown placeholder
 */
export declare function shutdownWeLayerPool(): Promise<void>;
/**
 * We-layer retrieval - Uses Graphiti with pattern fallback
 */
export declare function retrieveDeeper(userId: string, message: string, existingAssociations?: Association[]): Promise<RetrievalResult>;
/**
 * Store conversation turn in Graphiti (called after response)
 */
export declare function persistConversation(userId: string, userMessage: string, assistantResponse: string, debug?: boolean): Promise<void>;
/**
 * Get Graphiti connection status (with live check if not initialized)
 */
export declare function getGraphitiStatusAsync(): Promise<{
    healthy: boolean;
    latencyMs: number;
}>;
/**
 * Get Graphiti connection status (sync - returns cached value)
 */
export declare function getGraphitiStatus(): {
    healthy: boolean;
    latencyMs: number;
};
/**
 * FUTURE: The General - Root orchestrator
 */
export declare function theGeneral(userId: string, message: string, _context: {
    sessionId: string;
}): Promise<void>;
/**
 * FUTURE: Memory Commander
 */
export declare function memoryCommander(userId: string, message: string): Promise<Association[]>;
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
export declare function runDeepUnconscious(userId: string, sessionId: string, message: string, debug?: boolean): Promise<DeepUnconsciousResult>;
/**
 * Check if deep unconscious is enabled
 */
export declare function isDeepUnconsciousEnabled(): boolean;
/**
 * Enable/disable deep unconscious mode at runtime
 */
export declare function setDeepUnconsciousMode(enabled: boolean, config?: Partial<UnconsciousSpawnerConfig>): void;
export {};
//# sourceMappingURL=we-layer.d.ts.map