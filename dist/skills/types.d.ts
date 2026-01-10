/**
 * Skill Types
 *
 * Skills are cognitive capabilities that extend Zosia's mind.
 * Following the Open Agent Skills Standard with Zosia-specific extensions.
 */
/**
 * Skill manifest from SKILL.md frontmatter
 * Compatible with Open Agent Skills Standard + Zosia extensions
 */
export interface SkillManifest {
    name: string;
    description: string;
    version?: string;
    mode?: 'inline' | 'subagent';
    layers: ('i-layer' | 'we-layer')[];
    dependencies?: string[];
    defaultEnabled: boolean;
    surfacing?: {
        baseChance: number;
        modifiers?: Record<string, number>;
    };
    state?: string[];
}
/**
 * Loaded skill with all components
 */
export interface Skill {
    id: string;
    manifest: SkillManifest;
    iLayerPrompt?: string;
    weLayerPrompt?: string;
    feltVocabulary?: FeltVocabulary;
}
/**
 * Felt vocabulary for translating experiences to language
 */
export interface FeltVocabulary {
    [emotion: string]: {
        subtle: string;
        moderate: string;
        strong: string;
    };
}
/**
 * Skill runtime state
 */
export interface SkillState {
    skillId: string;
    lastUpdated: string;
    data: Record<string, unknown>;
}
/**
 * Composed prompts ready for injection
 */
export interface ComposedPrompts {
    iLayerPrompt: string;
    weLayerPrompt: string;
    feltVocabulary: FeltVocabulary;
}
/**
 * User configuration for skill enable/disable
 */
export interface SkillsConfig {
    enabled: string[];
    disabled: string[];
}
//# sourceMappingURL=types.d.ts.map