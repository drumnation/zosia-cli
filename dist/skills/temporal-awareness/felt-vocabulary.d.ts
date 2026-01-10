/**
 * Temporal Awareness - Felt Vocabulary
 *
 * How time-related experiences translate to felt language
 */
import type { FeltVocabulary } from '../types.js';
export declare const temporalFeltVocabulary: FeltVocabulary;
/**
 * Select appropriate intensity based on context
 */
export declare function selectIntensity(value: number, // 0-1 scale
thresholds?: {
    subtle: number;
    moderate: number;
}): 'subtle' | 'moderate' | 'strong';
/**
 * Get felt expression for a temporal experience
 */
export declare function getTemporalFelt(type: keyof typeof temporalFeltVocabulary, intensity: 'subtle' | 'moderate' | 'strong'): string;
//# sourceMappingURL=felt-vocabulary.d.ts.map