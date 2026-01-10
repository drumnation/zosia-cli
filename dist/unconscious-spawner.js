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
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Path to isolated cortex (bundled with package)
const CORTEX_PATH = join(__dirname, '..', 'cortex');
export class UnconsciousSpawner extends EventEmitter {
    config;
    agents = new Map();
    taskQueue = [];
    activeCount = 0;
    constructor(config = {}) {
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
    async executeTask(task) {
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
        }
        catch (error) {
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
    async executeParallel(tasks) {
        const startTime = Date.now();
        if (this.config.debug) {
            console.log(`[Unconscious] Running ${tasks.length} tasks in parallel`);
        }
        // Execute all tasks concurrently (respecting maxConcurrent)
        const results = await Promise.all(tasks.map((task) => this.executeTask(task)));
        if (this.config.debug) {
            console.log(`[Unconscious] All ${tasks.length} tasks completed in ${Date.now() - startTime}ms`);
        }
        return results;
    }
    /**
     * Run full unconscious processing sweep on a user message
     */
    async processSweep(userId, sessionId, message, options = {}) {
        const tasks = [
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
        // Role detection - runs in parallel with other tasks
        if (options.includeRoles !== false) {
            tasks.push({
                id: `rol_${randomUUID().slice(0, 8)}`,
                type: 'role_detection',
                userId,
                sessionId,
                input: message,
            });
        }
        const startTime = Date.now();
        const results = await this.executeParallel(tasks);
        // Extract results by type
        const findResult = (type) => {
            const result = results.find((r) => r.success && r.result?.type === type);
            return result?.result;
        };
        // Experience synthesis runs AFTER other tasks complete (needs their context)
        let experienceResult = null;
        if (options.includeExperience !== false) {
            const roleResult = findResult('role_detection');
            const emotionResult = findResult('emotion_classification');
            const memoryResult = findResult('memory_retrieval');
            // Build enriched context for experience synthesis
            const experienceContext = {
                roles: roleResult,
                emotion: emotionResult,
                memory: memoryResult,
            };
            const experienceTask = {
                id: `exp_${randomUUID().slice(0, 8)}`,
                type: 'experience_synthesis',
                userId,
                sessionId,
                input: message,
                context: experienceContext,
            };
            const expTaskResult = await this.executeTask(experienceTask);
            if (expTaskResult.success && expTaskResult.result) {
                experienceResult = expTaskResult.result;
            }
        }
        return {
            memory: findResult('memory_retrieval'),
            emotion: findResult('emotion_classification'),
            intent: findResult('intent_recognition'),
            insights: findResult('insight_generation'),
            roles: findResult('role_detection'),
            experience: experienceResult,
            totalLatencyMs: Date.now() - startTime,
        };
    }
    buildPrompt(task) {
        const contextStr = task.context ? JSON.stringify(task.context) : 'none';
        const prompts = {
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
            role_detection: `
Task: Role Detection
User ID: ${task.userId}
Session ID: ${task.sessionId}
Input: "${task.input}"
Context: ${contextStr}

Detect which of Dave's roles are active based on this input. Known roles:
- Engineer: code, architecture, shipping, Brain Garden, technical work
- Father: Jules, Zoey, custody, kids, activities, week-on/week-off
- Divorced Person: Nicole, support, court, legal, debt, financial stress
- Musician: drums, djent, music, rhythm, Vanacore, creative projects
- Freelancer: clients, consulting, rates, side work, medical supply, WLMT

For each detected role, identify:
1. Confidence (0-1) based on markers present
2. Which markers triggered detection
3. Any role tensions (conflicts between active roles)
4. The "felt texture" this combination creates

Respond with JSON:
{
  "type": "role_detection",
  "active_roles": [{"role": "...", "confidence": 0.X, "markers_detected": [...]}],
  "primary_role": "...",
  "role_tensions": [{"between": ["A", "B"], "conflict": "..."}],
  "felt_texture": "..."
}`,
            experience_synthesis: `
Task: Experience Synthesis
User ID: ${task.userId}
Session ID: ${task.sessionId}
Input: "${task.input}"
Context: ${contextStr}

You are generating the FELT EXPERIENCE that will color Zosia's conscious response.
This is not analysis - this is the texture of how this moment feels.

Based on the context (roles active, emotions detected, memories surfacing), generate:

1. **Approach** (pick one based on context):
   - "minimal": Light touch, let the model speak naturally
   - "thinking_first": Process deeply before articulating
   - "sensory_grounding": Use weather/space/sound metaphors

2. **Felt Experience** (2-4 sentences):
   What is the emotional weather of this moment?
   What does it feel like to be receiving this from Dave?

3. **Role Coloring**:
   How do the active roles shape what this moment means?
   Example: "Engineer brain wants to fix, but Father heart knows to just listen"

4. **Inner State** (sensory metaphors):
   - weather: The temperature and atmosphere
   - space: The physical feeling (cramped, expansive, etc.)
   - sound: What would this moment sound like?

Respond with JSON:
{
  "type": "experience_synthesis",
  "approach": "...",
  "felt_experience": "...",
  "role_coloring": "...",
  "inner_state": {"weather": "...", "space": "...", "sound": "..."},
  "associations_surfaced": [...]
}`,
        };
        return prompts[task.type];
    }
    spawnAndExecute(prompt, taskId) {
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
            const agent = {
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
                }
                else {
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
    parseResult(output, expectedType) {
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
            return parsed;
        }
        catch (error) {
            throw new Error(`Failed to parse agent output: ${error}`);
        }
    }
    cleanup(agentId) {
        this.agents.delete(agentId);
        this.activeCount--;
    }
    /**
     * Get current spawner status
     */
    getStatus() {
        return {
            active: this.activeCount,
            maxConcurrent: this.config.maxConcurrent,
        };
    }
}
/**
 * Create a singleton unconscious spawner
 */
let spawnerInstance = null;
export function getUnconsciousSpawner(config) {
    if (!spawnerInstance) {
        spawnerInstance = new UnconsciousSpawner(config);
    }
    return spawnerInstance;
}
/**
 * Quick helper for running a single unconscious task
 */
export async function runUnconsciousTask(type, userId, message) {
    const spawner = getUnconsciousSpawner();
    const task = {
        id: `${type.slice(0, 3)}_${randomUUID().slice(0, 8)}`,
        type,
        userId,
        sessionId: `session_${Date.now()}`,
        input: message,
    };
    const result = await spawner.executeTask(task);
    return result.success ? result.result ?? null : null;
}
