/**
 * Skills Module
 *
 * This module provides access to Zosia's skill system.
 * Skills are cognitive capabilities that extend how Zosia thinks.
 *
 * The loader discovers skills, composes their prompts, and injects them
 * into the I-layer (conscious) and We-layer (subconscious) system prompts.
 */
export * from './types.js';
export * from './loader.js';
import type { ComposedPrompts, Skill } from './types.js';
/**
 * Get composed prompts with all enabled skills
 * Results are cached for performance
 */
export declare function getComposedPrompts(forceRefresh?: boolean): Promise<ComposedPrompts>;
/**
 * Get the I-layer prompt with all enabled skills composed
 */
export declare function getILayerPrompt(forceRefresh?: boolean): Promise<string>;
/**
 * Get the We-layer prompt with all enabled skills composed
 */
export declare function getWeLayerPrompt(forceRefresh?: boolean): Promise<string>;
/**
 * Get currently loaded skills
 */
export declare function getLoadedSkills(): Promise<Skill[]>;
/**
 * Clear the prompt cache (useful when skills are enabled/disabled)
 */
export declare function clearPromptCache(): void;
//# sourceMappingURL=index.d.ts.map