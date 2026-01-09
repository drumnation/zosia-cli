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
import type { ComposedPrompts, Skill } from './types.js';

// Cache for composed prompts
let cachedPrompts: ComposedPrompts | null = null;
let cachedSkills: Skill[] | null = null;

/**
 * Get composed prompts with all enabled skills
 * Results are cached for performance
 */
export async function getComposedPrompts(forceRefresh = false): Promise<ComposedPrompts> {
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
export async function getILayerPrompt(forceRefresh = false): Promise<string> {
  const composed = await getComposedPrompts(forceRefresh);
  return composed.iLayerPrompt;
}

/**
 * Get the We-layer prompt with all enabled skills composed
 */
export async function getWeLayerPrompt(forceRefresh = false): Promise<string> {
  const composed = await getComposedPrompts(forceRefresh);
  return composed.weLayerPrompt;
}

/**
 * Get currently loaded skills
 */
export async function getLoadedSkills(): Promise<Skill[]> {
  if (cachedSkills) {
    return cachedSkills;
  }

  cachedSkills = await loadEnabledSkills();
  return cachedSkills;
}

/**
 * Clear the prompt cache (useful when skills are enabled/disabled)
 */
export function clearPromptCache(): void {
  cachedPrompts = null;
  cachedSkills = null;
}
