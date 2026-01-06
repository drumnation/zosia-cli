/**
 * Unconscious Spawner - Claude Code instances for We-Layer processing
 *
 * Uses pipe-based spawning with isolated cortex configuration.
 * Supports parallel task execution for:
 * - Memory retrieval
 * - Emotion classification
 * - Intent recognition
 * - Insight generation
 *
 * Key features:
 * - CLAUDE_CONFIG_DIR override for isolated cortex
 * - Pipe-based I/O (no keyboard disturbances)
 * - Optional pre-warmed agent pool for <100ms acquisition
 */
import { EventEmitter } from 'events';
export type UnconsciousTaskType = 'memory_retrieval' | 'emotion_classification' | 'intent_recognition' | 'insight_generation';
export interface Association {
    type: 'RECALL' | 'HUNCH' | 'PULL' | 'SIGN';
    intensity: 'faint' | 'medium' | 'strong';
    text: string;
    source: 'graphiti' | 'pattern' | 'inference';
}
export interface MemoryRetrievalResult {
    type: 'memory_retrieval';
    associations: Association[];
    synthesis: string;
}
export interface EmotionClassificationResult {
    type: 'emotion_classification';
    primary: string;
    secondary: string[];
    intensity: number;
    signals: string[];
}
export interface IntentRecognitionResult {
    type: 'intent_recognition';
    primary_intent: string;
    sub_intents: string[];
    confidence: number;
    needs: string[];
}
export interface InsightGenerationResult {
    type: 'insight_generation';
    insights: Array<{
        content: string;
        relevance: number;
        novelty: number;
        actionable: boolean;
    }>;
    connections: string[];
}
export type UnconsciousResult = MemoryRetrievalResult | EmotionClassificationResult | IntentRecognitionResult | InsightGenerationResult;
export interface UnconsciousTask {
    id: string;
    type: UnconsciousTaskType;
    userId: string;
    sessionId: string;
    input: string;
    context?: Record<string, unknown>;
}
export interface UnconsciousTaskResult {
    taskId: string;
    success: boolean;
    result?: UnconsciousResult;
    error?: string;
    latencyMs: number;
}
export interface UnconsciousSpawnerConfig {
    /** Path to Claude CLI (default: 'claude') */
    claudeCommand?: string;
    /** Max concurrent agents (default: 4) */
    maxConcurrent?: number;
    /** Task timeout in ms (default: 30000) */
    timeout?: number;
    /** Model to use (default: 'claude-sonnet-4-20250514') */
    model?: string;
    /** Debug output */
    debug?: boolean;
}
export declare class UnconsciousSpawner extends EventEmitter {
    private config;
    private agents;
    private taskQueue;
    private activeCount;
    constructor(config?: Partial<UnconsciousSpawnerConfig>);
    /**
     * Execute a single unconscious task
     */
    executeTask(task: UnconsciousTask): Promise<UnconsciousTaskResult>;
    /**
     * Execute multiple tasks in parallel
     */
    executeParallel(tasks: UnconsciousTask[]): Promise<UnconsciousTaskResult[]>;
    /**
     * Run full unconscious processing sweep on a user message
     */
    processSweep(userId: string, sessionId: string, message: string, options?: {
        includeInsights?: boolean;
    }): Promise<{
        memory: MemoryRetrievalResult | null;
        emotion: EmotionClassificationResult | null;
        intent: IntentRecognitionResult | null;
        insights: InsightGenerationResult | null;
        totalLatencyMs: number;
    }>;
    private buildPrompt;
    private spawnAndExecute;
    private parseResult;
    private cleanup;
    /**
     * Get current spawner status
     */
    getStatus(): {
        active: number;
        maxConcurrent: number;
    };
}
export declare function getUnconsciousSpawner(config?: Partial<UnconsciousSpawnerConfig>): UnconsciousSpawner;
/**
 * Quick helper for running a single unconscious task
 */
export declare function runUnconsciousTask(type: UnconsciousTaskType, userId: string, message: string): Promise<UnconsciousResult | null>;
//# sourceMappingURL=unconscious-spawner.d.ts.map