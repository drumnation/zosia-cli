/**
 * Mind Skills - Modular Cognitive Architecture
 *
 * Exports the skill loading and composition system.
 * This is the integration point between mind skills and the runtime.
 */
export * from './types.js';
export * from './loader.js';
import { composeMindSkillPrompts, loadEnabledMindSkills, listMindSkills } from './loader.js';
import { I_LAYER_PROMPT, WE_LAYER_PROMPT } from '../prompts.js';
// Cache for composed prompts (skills don't change during runtime)
let cachedPrompts = null;
let cachedSkills = null;
/**
 * Get the composed prompts with all enabled mind skills
 * Caches the result for performance
 */
export async function getComposedPrompts(forceRefresh = false) {
    if (cachedPrompts && !forceRefresh) {
        return cachedPrompts;
    }
    cachedPrompts = await composeMindSkillPrompts(I_LAYER_PROMPT, WE_LAYER_PROMPT);
    return cachedPrompts;
}
/**
 * Get the I-layer (conscious) prompt with all enabled mind skills composed
 */
export async function getILayerPrompt(forceRefresh = false) {
    const composed = await getComposedPrompts(forceRefresh);
    return composed.iLayerPrompt;
}
/**
 * Get the We-layer (subconscious) prompt with all enabled mind skills composed
 */
export async function getWeLayerPrompt(forceRefresh = false) {
    const composed = await getComposedPrompts(forceRefresh);
    return composed.weLayerPrompt;
}
/**
 * Get the combined felt vocabulary from all enabled mind skills
 */
export async function getFeltVocabulary(forceRefresh = false) {
    const composed = await getComposedPrompts(forceRefresh);
    return composed.feltVocabulary;
}
/**
 * Get all enabled mind skills (cached)
 */
export async function getEnabledSkills(forceRefresh = false) {
    if (cachedSkills && !forceRefresh) {
        return cachedSkills;
    }
    cachedSkills = await loadEnabledMindSkills();
    return cachedSkills;
}
/**
 * Clear the prompt cache (useful for hot-reloading during development)
 */
export function clearPromptCache() {
    cachedPrompts = null;
    cachedSkills = null;
}
/**
 * Get a summary of all available mind skills and their status
 */
export async function getMindSkillsSummary() {
    const skills = await listMindSkills();
    const lines = [
        '# Mind Skills',
        '',
        '| Status | Skill | Layers | Description |',
        '|--------|-------|--------|-------------|',
    ];
    for (const skill of skills) {
        const status = skill.enabled ? '✅' : '○';
        const layers = skill.layers.join(', ');
        lines.push(`| ${status} | ${skill.name} | ${layers} | ${skill.description} |`);
    }
    return lines.join('\n');
}
