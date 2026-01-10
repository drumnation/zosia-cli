/**
 * Skill Loader
 *
 * Discovers and loads skills following the Open Agent Skills Standard.
 * Composes I-layer and We-layer prompts from enabled skills.
 */
import type { Skill, ComposedPrompts } from './types.js';
/**
 * Discover all skills in the skills directory
 */
export declare function discoverSkills(): Promise<string[]>;
/**
 * Load a single skill by ID
 */
export declare function loadSkill(skillId: string): Promise<Skill | null>;
/**
 * Load all enabled skills
 */
export declare function loadEnabledSkills(enabledSkillIds?: string[]): Promise<Skill[]>;
/**
 * Compose final prompts from enabled skills
 */
export declare function composeSkillPrompts(baseILayerPrompt: string, baseWeLayerPrompt: string, enabledSkillIds?: string[]): Promise<ComposedPrompts>;
/**
 * Get list of all available skills with their status
 */
export declare function listSkills(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    defaultEnabled: boolean;
    overridden: boolean;
    layers: string[];
}>>;
//# sourceMappingURL=loader.d.ts.map