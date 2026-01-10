/**
 * Mind Skill Types
 *
 * Mind Skills are intrinsic cognitive capabilities that shape how Zosia thinks.
 * They are not external plugins - they are part of her mind.
 */
export interface MindSkillManifest {
    id: string;
    name: string;
    description: string;
    version: string;
    layers: ('conscious' | 'subconscious')[];
    dependencies?: string[];
    defaultEnabled: boolean;
}
export interface MindSkill {
    manifest: MindSkillManifest;
    consciousPrompt?: string;
    subconsciousPrompt?: string;
    feltVocabulary?: FeltVocabulary;
    getState?: () => Promise<MindSkillState>;
    setState?: (state: MindSkillState) => Promise<void>;
}
export interface FeltVocabulary {
    [emotion: string]: {
        subtle: string;
        moderate: string;
        strong: string;
    };
}
export interface MindSkillState {
    skillId: string;
    lastUpdated: string;
    data: Record<string, unknown>;
}
export interface ComposedPrompts {
    iLayerPrompt: string;
    weLayerPrompt: string;
    feltVocabulary: FeltVocabulary;
}
//# sourceMappingURL=types.d.ts.map