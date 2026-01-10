/**
 * Zosia Experiments v2 - Personalized Depth Testing
 *
 * Testing companion AI quality with personalized context
 */

// Context loading
export {
  ContextLoader,
  createContextLoader,
  RELATIONSHIP_STAGES,
  DOMAIN_PRESETS,
  type ContextBundle,
  type ContextLevel,
  type RelationshipStage,
  type Level2Domain,
  type ContextLoaderConfig,
} from './context-loader.js';

// Test runner
export {
  TestRunner,
  createTestRunner,
  DEFAULT_TEST_PROMPTS,
  DEFAULT_MODELS,
  type TestConfig,
  type TestPrompt,
  type TestResult,
  type TurnResult,
  type TestRunSummary,
  type Message,
} from './test-runner.js';
