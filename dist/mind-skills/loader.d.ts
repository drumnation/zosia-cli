/**
 * Mind Skill Loader
 *
 * Composes I-layer and We-layer prompts from enabled mind skills.
 * This is where the modular mind architecture becomes runtime reality.
 */
import type { MindSkill, ComposedPrompts } from './types.js';
/**
 * Discover all mind skills in the mind-skills directory
 */
export declare function discoverMindSkills(): Promise<string[]>;
/**
 * Load a single mind skill by ID
 */
export declare function loadMindSkill(skillId: string): Promise<MindSkill | null>;
/**
 * Load all enabled mind skills
 */
export declare function loadEnabledMindSkills(enabledSkillIds?: string[]): Promise<MindSkill[]>;
/**
 * Compose final prompts from enabled mind skills
 */
export declare function composeMindSkillPrompts(baseILayerPrompt: string, baseWeLayerPrompt: string, enabledSkillIds?: string[]): Promise<ComposedPrompts>;
/**
 * Get list of all available mind skills with their status
 */
export declare function listMindSkills(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    layers: string[];
}>>;
//# sourceMappingURL=loader.d.ts.map