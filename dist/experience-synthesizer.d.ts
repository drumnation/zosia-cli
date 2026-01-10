/**
 * Experience Synthesizer - Role-Aware Felt Experience Generation
 *
 * Combines all context layers to generate the "felt experience" that colors
 * Zosia's conscious response. This is the bridge between We-layer processing
 * and I-layer expression.
 *
 * Layer Weights (from architecture):
 * - Knowledge Layer: 25%
 * - Temporal Layer: 15%
 * - Roles Layer: 20%
 * - World State Layer: 10%
 * - Financial Layer: 10%
 * - Experience Layer: 20%
 */
import type { MemoryRetrievalResult, EmotionClassificationResult, IntentRecognitionResult, RoleDetectionResult, ExperienceSynthesisResult } from './unconscious-spawner.js';
export interface ContextLayers {
    memory: MemoryRetrievalResult | null;
    emotion: EmotionClassificationResult | null;
    intent: IntentRecognitionResult | null;
    roles: RoleDetectionResult | null;
    experience: ExperienceSynthesisResult | null;
    temporal?: {
        gapSinceLastSession?: number;
        isWeekOn?: boolean;
        timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    };
}
export interface MindState {
    /** The felt experience text for the I-layer */
    feltExperience: string;
    /** Which roles are coloring this moment */
    activeRoles: string[];
    /** The primary role driving the interaction */
    primaryRole: string | null;
    /** Role tensions to be aware of */
    tensions: Array<{
        between: [string, string];
        conflict: string;
    }>;
    /** Sensory metaphors for the moment */
    innerState: {
        weather: string;
        space: string;
        sound: string;
    };
    /** Memories that surfaced */
    associations: string[];
    /** Emotional context */
    emotionalTone: {
        primary: string;
        intensity: number;
    };
    /** What the user might need */
    inferredNeeds: string[];
}
/**
 * Synthesize all context layers into a unified MindState for the I-layer
 */
export declare function synthesizeMindState(layers: ContextLayers): MindState;
/**
 * Format MindState for injection into I-layer prompt
 */
export declare function formatMindStateForPrompt(mindState: MindState): string;
/**
 * Generate the We-layer → I-layer bridge prompt
 * This is injected before Zosia's conscious response
 */
export declare function generateExperienceBridgePrompt(mindState: MindState): string;
//# sourceMappingURL=experience-synthesizer.d.ts.map