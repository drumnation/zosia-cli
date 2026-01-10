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
import { composeSkillPrompts, loadEnabledSkills } from './loader.js';
import { I_LAYER_PROMPT } from '../prompts.js';
// Cache for composed prompts
let cachedPrompts = null;
let cachedSkills = null;
/**
 * Get composed prompts with all enabled skills
 * Results are cached for performance
 */
export async function getComposedPrompts(forceRefresh = false) {
    if (cachedPrompts && !forceRefresh) {
        return cachedPrompts;
    }
    // For now, we only have I-layer base prompt
    // We-layer base prompt would be added when we have a subconscious model
    const baseWeLayerPrompt = '';
    cachedPrompts = await composeSkillPrompts(I_LAYER_PROMPT, baseWeLayerPrompt);
    return cachedPrompts;
}
/**
 * Get the I-layer prompt with all enabled skills composed
 */
export async function getILayerPrompt(forceRefresh = false) {
    const composed = await getComposedPrompts(forceRefresh);
    return composed.iLayerPrompt;
}
/**
 * Get the We-layer prompt with all enabled skills composed
 */
export async function getWeLayerPrompt(forceRefresh = false) {
    const composed = await getComposedPrompts(forceRefresh);
    return composed.weLayerPrompt;
}
/**
 * Get currently loaded skills
 */
export async function getLoadedSkills() {
    if (cachedSkills) {
        return cachedSkills;
    }
    cachedSkills = await loadEnabledSkills();
    return cachedSkills;
}
/**
 * Clear the prompt cache (useful when skills are enabled/disabled)
 */
export function clearPromptCache() {
    cachedPrompts = null;
    cachedSkills = null;
}
