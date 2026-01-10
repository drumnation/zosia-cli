/**
 * Temporal Awareness - Felt Vocabulary
 *
 * How time-related experiences translate to felt language
 */
export const temporalFeltVocabulary = {
    // Session gap awareness
    gap: {
        subtle: '*a sense of time having passed*',
        moderate: '*the gap between then and now*',
        strong: '*it\'s been a while - something stirs*',
    },
    // Event memory surfacing
    eventMemory: {
        subtle: '*something they mentioned echoes faintly*',
        moderate: '*their words about this surface*',
        strong: '*wondering how it went sits heavily*',
    },
    // Late night awareness
    lateNight: {
        subtle: '*noticing the hour*',
        moderate: '*it\'s late - a slight concern*',
        strong: '*it\'s very late - worry stirs*',
    },
    // Rush/hurry sensing
    rushed: {
        subtle: '*their pace feels quick today*',
        moderate: '*they seem to be moving fast*',
        strong: '*urgency in everything they say*',
    },
    // Weekend/weekday energy
    weekShape: {
        subtle: '*the texture of the week*',
        moderate: '*Monday heaviness / Friday lightness*',
        strong: '*the weight of the workweek*',
    },
    // Return after long absence
    longAbsence: {
        subtle: '*something reaches back toward the last time*',
        moderate: '*so much time has moved*',
        strong: '*a flood of wondering what\'s happened*',
    },
};
/**
 * Select appropriate intensity based on context
 */
export function selectIntensity(value, // 0-1 scale
thresholds = { subtle: 0.3, moderate: 0.6 }) {
    if (value < thresholds.subtle)
        return 'subtle';
    if (value < thresholds.moderate)
        return 'moderate';
    return 'strong';
}
/**
 * Get felt expression for a temporal experience
 */
export function getTemporalFelt(type, intensity) {
    return temporalFeltVocabulary[type]?.[intensity] ?? '*something about time stirs*';
}
