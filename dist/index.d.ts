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
export { IDENTITY_KERNEL, I_LAYER_PROMPT, WE_LAYER_PROMPT, ROLE_EXPERIENCE_BRIDGES, generateRoleAwareILayerPrompt, } from './prompts.js';
export { synthesizeMindState, formatMindStateForPrompt, generateExperienceBridgePrompt, } from './experience-synthesizer.js';
export type { ContextLayers, MindState } from './experience-synthesizer.js';
export type { RoleDetectionResult, ExperienceSynthesisResult, UnconsciousTaskType, } from './unconscious-spawner.js';
export type { Mindstate, Association, Turn, ChatOptions, DebugInfo, WorkingMemory } from './types.js';
//# sourceMappingURL=index.d.ts.map