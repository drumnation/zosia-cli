/**
 * Zosia CLI Package Exports
 *
 * Use the CLI directly:
 *   pnpm zosia "Hello"
 *
 * Or import programmatically:
 *   import { chat } from '@zosia/cli';
 */

export { chat, getSession, clearSession } from './orchestrator.js';
export { callGemma, streamGemma } from './i-layer.js';
export { retrieveDeeper } from './we-layer.js';
export { IDENTITY_KERNEL, I_LAYER_PROMPT, WE_LAYER_PROMPT } from './prompts.js';
export type {
  Mindstate,
  Association,
  Turn,
  ChatOptions,
  DebugInfo,
  WorkingMemory
} from './types.js';
