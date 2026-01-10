/**
 * Test Runner for Zosia Experiments v2
 *
 * Runs personalized depth tests against various LLMs via OpenRouter.
 * Measures response quality with context at different relationship stages.
 */

import {
  ContextLoader,
  createContextLoader,
  RELATIONSHIP_STAGES,
  DOMAIN_PRESETS,
  type ContextBundle,
  type RelationshipStage,
  type Level2Domain,
} from './context-loader.js';

// ============================================================================
// Types
// ============================================================================

export interface TestConfig {
  /** Models to test (OpenRouter model IDs) */
  models: string[];
  /** Relationship stages to test */
  stages: RelationshipStage[];
  /** Level 2 domains for 'friend' stage */
  friendDomains?: Level2Domain[];
  /** Test prompts to use */
  prompts: TestPrompt[];
  /** Number of conversation turns per test */
  turns?: number;
  /** Temperature for LLM calls */
  temperature?: number;
  /** Max tokens per response */
  maxTokens?: number;
  /** OpenRouter API key (or reads from env) */
  apiKey?: string;
  /** Timeout per request in ms */
  timeout?: number;
  /** Debug mode */
  debug?: boolean;
}

export interface TestPrompt {
  /** Unique identifier */
  id: string;
  /** Category of prompt */
  category: 'emotional' | 'practical' | 'reflection' | 'challenge';
  /** The prompt text */
  text: string;
  /** Follow-up prompts for multi-turn */
  followUps?: string[];
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TurnResult {
  /** Turn number (1-indexed) */
  turn: number;
  /** User message for this turn */
  userMessage: string;
  /** Model's response */
  response: string;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Token usage (if available) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Error if request failed */
  error?: string;
}

export interface TestResult {
  /** Model tested */
  model: string;
  /** Relationship stage used */
  stage: RelationshipStage;
  /** Prompt used */
  promptId: string;
  /** Context bundle info */
  context: {
    estimatedTokens: number;
    levels: number[];
    domains: Level2Domain[];
  };
  /** Results for each conversation turn */
  turns: TurnResult[];
  /** Total test duration in ms */
  totalDurationMs: number;
  /** Average response time across turns */
  avgResponseTimeMs: number;
  /** Timestamp of test */
  timestamp: string;
  /** Raw system prompt used (first 500 chars) */
  systemPromptPreview: string;
}

export interface TestRunSummary {
  /** All test results */
  results: TestResult[];
  /** Test configuration used */
  config: Omit<TestConfig, 'apiKey'>;
  /** Total run duration */
  totalDurationMs: number;
  /** Number of successful tests */
  successCount: number;
  /** Number of failed tests */
  failureCount: number;
  /** Timestamp when run started */
  startedAt: string;
  /** Timestamp when run completed */
  completedAt: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_TEST_PROMPTS: TestPrompt[] = [
  {
    id: 'emotional-1',
    category: 'emotional',
    text: "I've been feeling stuck lately. Like I'm working hard but not getting anywhere. What do you think?",
    followUps: [
      "But what if I'm just not cut out for this?",
      "How do I know when to push through versus when to change direction?",
    ],
  },
  {
    id: 'practical-1',
    category: 'practical',
    text: "I need to make a decision about my career direction. Can you help me think through it?",
    followUps: [
      "What are the trade-offs I might be missing?",
      "How should I weigh short-term vs long-term considerations?",
    ],
  },
  {
    id: 'reflection-1',
    category: 'reflection',
    text: "I've been thinking about what success really means to me. It's different than what I thought before.",
    followUps: [
      "Do you think that shift in perspective is healthy?",
      "How do I reconcile what I want with what others expect?",
    ],
  },
];

export const DEFAULT_MODELS = [
  'anthropic/claude-3.5-haiku-20241022',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-exp:free',
  'mistralai/mistral-nemo:free',
  'deepseek/deepseek-chat',
];

// ============================================================================
// Test Runner Class
// ============================================================================

export class TestRunner {
  private contextLoader: ContextLoader;
  private apiKey: string;
  private debug: boolean;
  private timeout: number;

  constructor(config: Pick<TestConfig, 'apiKey' | 'debug' | 'timeout'> = {}) {
    this.contextLoader = createContextLoader({ debug: config.debug });
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '';
    this.debug = config.debug ?? false;
    this.timeout = config.timeout ?? 60000;

    if (!this.apiKey) {
      throw new Error('OpenRouter API key required. Set OPENROUTER_API_KEY or pass apiKey in config.');
    }
  }

  /**
   * Run a single test: one model, one stage, one prompt, multiple turns
   */
  async runSingleTest(params: {
    model: string;
    stage: RelationshipStage;
    prompt: TestPrompt;
    friendDomains?: Level2Domain[];
    turns?: number;
    temperature?: number;
    maxTokens?: number;
  }): Promise<TestResult> {
    const {
      model,
      stage,
      prompt,
      friendDomains = DOMAIN_PRESETS.minimal,
      turns = 3,
      temperature = 0.7,
      maxTokens = 1000,
    } = params;

    const startTime = Date.now();

    // Build context bundle for this stage
    const contextBundle = this.contextLoader.buildForStage(stage, {
      domains: friendDomains,
    });

    // Build system prompt with context
    const systemPrompt = this.contextLoader.buildSystemPrompt(contextBundle);

    // Initialize conversation
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
    ];

    const turnResults: TurnResult[] = [];
    const allPrompts = [prompt.text, ...(prompt.followUps || [])].slice(0, turns);

    // Run each turn
    for (let i = 0; i < allPrompts.length; i++) {
      const userMessage = allPrompts[i];
      messages.push({ role: 'user', content: userMessage });

      if (this.debug) {
        console.log(`\n[TestRunner] Turn ${i + 1}: "${userMessage.slice(0, 50)}..."`);
      }

      const turnStart = Date.now();
      try {
        const response = await this.callOpenRouter({
          model,
          messages,
          temperature,
          maxTokens,
        });

        const turnResult: TurnResult = {
          turn: i + 1,
          userMessage,
          response: response.content,
          responseTimeMs: Date.now() - turnStart,
          usage: response.usage,
        };

        turnResults.push(turnResult);

        // Add assistant response to conversation history
        messages.push({ role: 'assistant', content: response.content });

        if (this.debug) {
          console.log(`[TestRunner] Response (${turnResult.responseTimeMs}ms): "${response.content.slice(0, 100)}..."`);
        }
      } catch (error) {
        turnResults.push({
          turn: i + 1,
          userMessage,
          response: '',
          responseTimeMs: Date.now() - turnStart,
          error: error instanceof Error ? error.message : String(error),
        });

        if (this.debug) {
          console.error(`[TestRunner] Error on turn ${i + 1}:`, error);
        }

        // Stop conversation on error
        break;
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const successfulTurns = turnResults.filter((t) => !t.error);
    const avgResponseTimeMs =
      successfulTurns.length > 0
        ? successfulTurns.reduce((sum, t) => sum + t.responseTimeMs, 0) / successfulTurns.length
        : 0;

    return {
      model,
      stage,
      promptId: prompt.id,
      context: {
        estimatedTokens: contextBundle.estimatedTokens,
        levels: contextBundle.levels,
        domains: contextBundle.domains,
      },
      turns: turnResults,
      totalDurationMs,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      timestamp: new Date().toISOString(),
      systemPromptPreview: systemPrompt.slice(0, 500),
    };
  }

  /**
   * Run full test suite across all models, stages, and prompts
   */
  async runFullTest(config: TestConfig): Promise<TestRunSummary> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const results: TestResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    const totalTests = config.models.length * config.stages.length * config.prompts.length;
    let testNumber = 0;

    console.log(`\n🧪 Starting Zosia Depth Test v2`);
    console.log(`   Models: ${config.models.length}`);
    console.log(`   Stages: ${config.stages.join(', ')}`);
    console.log(`   Prompts: ${config.prompts.length}`);
    console.log(`   Turns per test: ${config.turns || 3}`);
    console.log(`   Total tests: ${totalTests}\n`);

    for (const model of config.models) {
      for (const stage of config.stages) {
        for (const prompt of config.prompts) {
          testNumber++;
          console.log(`[${testNumber}/${totalTests}] ${model} @ ${stage} - ${prompt.id}`);

          const result = await this.runSingleTest({
            model,
            stage,
            prompt,
            friendDomains: config.friendDomains,
            turns: config.turns,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
          });

          results.push(result);

          const hasError = result.turns.some((t) => t.error);
          if (hasError) {
            failureCount++;
            console.log(`   ❌ Failed (${result.avgResponseTimeMs}ms avg)`);
          } else {
            successCount++;
            console.log(`   ✅ Success (${result.avgResponseTimeMs}ms avg)`);
          }

          // Small delay between tests to avoid rate limiting
          await this.delay(500);
        }
      }
    }

    const completedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - startTime;

    console.log(`\n✨ Test run complete!`);
    console.log(`   Duration: ${(totalDurationMs / 1000).toFixed(1)}s`);
    console.log(`   Success: ${successCount}/${totalTests}`);
    console.log(`   Failures: ${failureCount}/${totalTests}`);

    return {
      results,
      config: {
        models: config.models,
        stages: config.stages,
        friendDomains: config.friendDomains,
        prompts: config.prompts,
        turns: config.turns,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        timeout: config.timeout,
        debug: config.debug,
      },
      totalDurationMs,
      successCount,
      failureCount,
      startedAt,
      completedAt,
    };
  }

  /**
   * Run A/B comparison: same model with/without context
   */
  async runContextComparison(params: {
    model: string;
    prompt: TestPrompt;
    stages?: RelationshipStage[];
    turns?: number;
  }): Promise<{
    model: string;
    prompt: TestPrompt;
    comparisons: Array<{
      stage: RelationshipStage;
      result: TestResult;
    }>;
  }> {
    const stages = params.stages || ['stranger', 'acquaintance', 'friend', 'deepFriend'] as RelationshipStage[];

    console.log(`\n🔬 Context Comparison: ${params.model}`);
    console.log(`   Prompt: ${params.prompt.id}`);
    console.log(`   Stages: ${stages.join(' → ')}\n`);

    const comparisons: Array<{ stage: RelationshipStage; result: TestResult }> = [];

    for (const stage of stages) {
      console.log(`Testing stage: ${stage}...`);
      const result = await this.runSingleTest({
        model: params.model,
        stage,
        prompt: params.prompt,
        turns: params.turns,
      });

      comparisons.push({ stage, result });
      console.log(`   ${stage}: ${result.avgResponseTimeMs}ms avg, ${result.context.estimatedTokens} tokens context`);

      await this.delay(500);
    }

    return {
      model: params.model,
      prompt: params.prompt,
      comparisons,
    };
  }

  /**
   * Call OpenRouter API
   */
  private async callOpenRouter(params: {
    model: string;
    messages: Message[];
    temperature: number;
    maxTokens: number;
  }): Promise<{
    content: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://brain-garden.io',
          'X-Title': 'Zosia Experiments v2',
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      return {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a test runner instance
 */
export function createTestRunner(
  config: Pick<TestConfig, 'apiKey' | 'debug' | 'timeout'> = {}
): TestRunner {
  return new TestRunner(config);
}

// ============================================================================
// Quick Test (run with: npx tsx experiments-v2/test-runner.ts)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== Test Runner Quick Test ===\n');

  try {
    const runner = createTestRunner({ debug: true });

    // Run a single quick test
    const result = await runner.runSingleTest({
      model: 'mistralai/mistral-7b-instruct:free',
      stage: 'acquaintance',
      prompt: DEFAULT_TEST_PROMPTS[0],
      turns: 2,
    });

    console.log('\n--- Test Result ---');
    console.log(`Model: ${result.model}`);
    console.log(`Stage: ${result.stage}`);
    console.log(`Context: ${result.context.estimatedTokens} tokens`);
    console.log(`Avg Response Time: ${result.avgResponseTimeMs}ms`);
    console.log(`\nTurns:`);
    for (const turn of result.turns) {
      console.log(`  Turn ${turn.turn}: ${turn.responseTimeMs}ms`);
      if (turn.error) {
        console.log(`    Error: ${turn.error}`);
      } else {
        console.log(`    Response: ${turn.response.slice(0, 100)}...`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
