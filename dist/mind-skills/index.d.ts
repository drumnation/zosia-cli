/**
 * Mind Skills - Modular Cognitive Architecture
 *
 * Exports the skill loading and composition system.
 * This is the integration point between mind skills and the runtime.
 */
export * from './types.js';
export * from './loader.js';
import type { ComposedPrompts, MindSkill } from './types.js';
/**
 * Get the composed prompts with all enabled mind skills
 * Caches the result for performance
 */
export declare function getComposedPrompts(forceRefresh?: boolean): Promise<ComposedPrompts>;
/**
 * Get the I-layer (conscious) prompt with all enabled mind skills composed
 */
export declare function getILayerPrompt(forceRefresh?: boolean): Promise<string>;
/**
 * Get the We-layer (subconscious) prompt with all enabled mind skills composed
 */
export declare function getWeLayerPrompt(forceRefresh?: boolean): Promise<string>;
/**
 * Get the combined felt vocabulary from all enabled mind skills
 */
export declare function getFeltVocabulary(forceRefresh?: boolean): Promise<Record<string, unknown>>;
/**
 * Get all enabled mind skills (cached)
 */
export declare function getEnabledSkills(forceRefresh?: boolean): Promise<MindSkill[]>;
/**
 * Clear the prompt cache (useful for hot-reloading during development)
 */
export declare function clearPromptCache(): void;
/**
 * Get a summary of all available mind skills and their status
 */
export declare function getMindSkillsSummary(): Promise<string>;
//# sourceMappingURL=index.d.ts.map