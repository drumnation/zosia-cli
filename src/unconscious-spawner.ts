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

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to isolated cortex (bundled with package)
const CORTEX_PATH = join(__dirname, '..', 'cortex');

export type UnconsciousTaskType =
  | 'memory_retrieval'
  | 'emotion_classification'
  | 'intent_recognition'
  | 'insight_generation';

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

export type UnconsciousResult =
  | MemoryRetrievalResult
  | EmotionClassificationResult
  | IntentRecognitionResult
  | InsightGenerationResult;

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

interface SpawnedAgent {
  id: string;
  process: ChildProcess;
  startedAt: Date;
  status: 'starting' | 'ready' | 'running' | 'completed' | 'failed';
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

export class UnconsciousSpawner extends EventEmitter {
  private config: Required<UnconsciousSpawnerConfig>;
  private agents: Map<string, SpawnedAgent> = new Map();
  private taskQueue: UnconsciousTask[] = [];
  private activeCount = 0;

  constructor(config: Partial<UnconsciousSpawnerConfig> = {}) {
    super();
    this.config = {
      claudeCommand: config.claudeCommand ?? 'claude',
      maxConcurrent: config.maxConcurrent ?? 4,
      timeout: config.timeout ?? 30000,
      model: config.model ?? 'claude-sonnet-4-20250514',
      debug: config.debug ?? false,
    };
  }

  /**
   * Execute a single unconscious task
   */
  async executeTask(task: UnconsciousTask): Promise<UnconsciousTaskResult> {
    const startTime = Date.now();

    if (this.config.debug) {
      console.log(`[Unconscious] Starting ${task.type} task ${task.id}`);
    }

    try {
      // Build the prompt for this task type
      const prompt = this.buildPrompt(task);

      // Spawn Claude with isolated cortex
      const result = await this.spawnAndExecute(prompt, task.id);

      // Parse the JSON result
      const parsed = this.parseResult(result, task.type);

      return {
        taskId: task.id,
        success: true,
        result: parsed,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel(tasks: UnconsciousTask[]): Promise<UnconsciousTaskResult[]> {
    const startTime = Date.now();

    if (this.config.debug) {
      console.log(`[Unconscious] Running ${tasks.length} tasks in parallel`);
    }

    // Execute all tasks concurrently (respecting maxConcurrent)
    const results = await Promise.all(
      tasks.map((task) => this.executeTask(task))
    );

    if (this.config.debug) {
      console.log(`[Unconscious] All ${tasks.length} tasks completed in ${Date.now() - startTime}ms`);
    }

    return results;
  }

  /**
   * Run full unconscious processing sweep on a user message
   */
  async processSweep(
    userId: string,
    sessionId: string,
    message: string,
    options: { includeInsights?: boolean } = {}
  ): Promise<{
    memory: MemoryRetrievalResult | null;
    emotion: EmotionClassificationResult | null;
    intent: IntentRecognitionResult | null;
    insights: InsightGenerationResult | null;
    totalLatencyMs: number;
  }> {
    const tasks: UnconsciousTask[] = [
      {
        id: `mem_${randomUUID().slice(0, 8)}`,
        type: 'memory_retrieval',
        userId,
        sessionId,
        input: message,
      },
      {
        id: `emo_${randomUUID().slice(0, 8)}`,
        type: 'emotion_classification',
        userId,
        sessionId,
        input: message,
      },
      {
        id: `int_${randomUUID().slice(0, 8)}`,
        type: 'intent_recognition',
        userId,
        sessionId,
        input: message,
      },
    ];

    if (options.includeInsights) {
      tasks.push({
        id: `ins_${randomUUID().slice(0, 8)}`,
        type: 'insight_generation',
        userId,
        sessionId,
        input: message,
      });
    }

    const startTime = Date.now();
    const results = await this.executeParallel(tasks);

    // Extract results by type
    const findResult = <T extends UnconsciousResult>(type: UnconsciousTaskType): T | null => {
      const result = results.find((r) => r.success && r.result?.type === type);
      return result?.result as T | null;
    };

    return {
      memory: findResult<MemoryRetrievalResult>('memory_retrieval'),
      emotion: findResult<EmotionClassificationResult>('emotion_classification'),
      intent: findResult<IntentRecognitionResult>('intent_recognition'),
      insights: findResult<InsightGenerationResult>('insight_generation'),
      totalLatencyMs: Date.now() - startTime,
    };
  }

  private buildPrompt(task: UnconsciousTask): string {
    const contextStr = task.context ? JSON.stringify(task.context) : 'none';

    const prompts: Record<UnconsciousTaskType, string> = {
      memory_retrieval: `
Task: Memory Retrieval
User ID: ${task.userId}
Session ID: ${task.sessionId}
Input: "${task.input}"
Context: ${contextStr}

Search your memory for relevant associations to this input. Include:
- Past conversations or topics related to this
- Emotional patterns you've observed
- Commitments or promises that might be relevant
- Connections to the user's goals or projects

Respond with structured JSON per your CLAUDE.md instructions.`,

      emotion_classification: `
Task: Emotion Classification
User ID: ${task.userId}
Session ID: ${task.sessionId}
Input: "${task.input}"

Analyze the emotional content of this input. Detect:
- Primary emotion (joy, sadness, anger, fear, surprise, disgust, neutral)
- Secondary/nuanced emotions
- Emotional intensity (0-1)
- Specific signals that led to your classification

Respond with structured JSON per your CLAUDE.md instructions.`,

      intent_recognition: `
Task: Intent Recognition
User ID: ${task.userId}
Session ID: ${task.sessionId}
Input: "${task.input}"

Identify what the user is trying to accomplish. Consider:
- Explicit stated intent
- Implicit/unstated needs
- Potential sub-intents or secondary goals
- What they might need but haven't articulated

Respond with structured JSON per your CLAUDE.md instructions.`,

      insight_generation: `
Task: Insight Generation
User ID: ${task.userId}
Session ID: ${task.sessionId}
Input: "${task.input}"
Context: ${contextStr}

Generate insights that could enrich the response to this input. Look for:
- Non-obvious connections
- Reframings that might help
- Patterns across time
- Actionable suggestions

Respond with structured JSON per your CLAUDE.md instructions.`,
    };

    return prompts[task.type];
  }

  private spawnAndExecute(prompt: string, taskId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const agentId = randomUUID();

      // Build command with isolated cortex
      const args = [
        '--print',
        '--output-format=json',
        '--model', this.config.model,
        '-p', prompt,
      ];

      // Environment with isolated cortex
      const env = {
        ...process.env,
        CLAUDE_CONFIG_DIR: CORTEX_PATH,
        // Disable hooks that might interfere
        CLAUDE_SKIP_HOOKS: '1',
      };

      if (this.config.debug) {
        console.log(`[Unconscious] Spawning agent ${agentId} with CLAUDE_CONFIG_DIR=${CORTEX_PATH}`);
      }

      const proc = spawn(this.config.claudeCommand, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
      });

      const agent: SpawnedAgent = {
        id: agentId,
        process: proc,
        startedAt: new Date(),
        status: 'running',
      };
      this.agents.set(agentId, agent);
      this.activeCount++;

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (this.config.debug) {
          console.error(`[Unconscious ${taskId}] stderr:`, data.toString());
        }
      });

      // Timeout handling
      const timeout = setTimeout(() => {
        proc.kill('SIGTERM');
        agent.status = 'failed';
        this.cleanup(agentId);
        reject(new Error(`Task ${taskId} timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        this.cleanup(agentId);

        if (code === 0) {
          agent.status = 'completed';
          resolve(stdout);
        } else {
          agent.status = 'failed';
          reject(new Error(`Claude exited with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        this.cleanup(agentId);
        agent.status = 'failed';
        reject(error);
      });
    });
  }

  private parseResult(output: string, expectedType: UnconsciousTaskType): UnconsciousResult {
    // Try to find JSON in the output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in agent output');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate type matches
      if (parsed.type !== expectedType) {
        // If type is missing, add it
        parsed.type = expectedType;
      }

      return parsed as UnconsciousResult;
    } catch (error) {
      throw new Error(`Failed to parse agent output: ${error}`);
    }
  }

  private cleanup(agentId: string): void {
    this.agents.delete(agentId);
    this.activeCount--;
  }

  /**
   * Get current spawner status
   */
  getStatus(): { active: number; maxConcurrent: number } {
    return {
      active: this.activeCount,
      maxConcurrent: this.config.maxConcurrent,
    };
  }
}

/**
 * Create a singleton unconscious spawner
 */
let spawnerInstance: UnconsciousSpawner | null = null;

export function getUnconsciousSpawner(
  config?: Partial<UnconsciousSpawnerConfig>
): UnconsciousSpawner {
  if (!spawnerInstance) {
    spawnerInstance = new UnconsciousSpawner(config);
  }
  return spawnerInstance;
}

/**
 * Quick helper for running a single unconscious task
 */
export async function runUnconsciousTask(
  type: UnconsciousTaskType,
  userId: string,
  message: string
): Promise<UnconsciousResult | null> {
  const spawner = getUnconsciousSpawner();
  const task: UnconsciousTask = {
    id: `${type.slice(0, 3)}_${randomUUID().slice(0, 8)}`,
    type,
    userId,
    sessionId: `session_${Date.now()}`,
    input: message,
  };

  const result = await spawner.executeTask(task);
  return result.success ? result.result ?? null : null;
}
