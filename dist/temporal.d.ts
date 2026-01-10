/**
 * Temporal Awareness Service
 *
 * Tracks real time gaps between sessions, known events, and provides
 * felt temporal context to the I-layer.
 */
export interface TemporalContext {
    gap: {
        minutes: number;
        hours: number;
        days: number;
        humanReadable: string;
        significance: 'just_now' | 'recent' | 'moderate' | 'significant' | 'long_absence';
    };
    timeOfDay: {
        hour: number;
        period: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_night';
        energyNote: string;
    };
    dayOfWeek: {
        day: string;
        isWeekend: boolean;
        typicalEnergy: string;
    };
    pendingEvents: Array<{
        event: string;
        mentionedDate: string;
        estimatedDate?: Date;
        status: 'upcoming' | 'passed' | 'unknown';
    }>;
    shouldSurface: boolean;
    surfaceType: 'gap' | 'event_memory' | 'late_night' | 'time_of_day' | null;
    feltSuggestion?: string;
}
/**
 * Store session timestamp in Graphiti
 */
export declare function recordSessionTimestamp(userId: string): Promise<void>;
/**
 * Store a mentioned event for future tracking
 */
export declare function recordMentionedEvent(userId: string, event: string, estimatedDate?: string): Promise<void>;
/**
 * Main function: Calculate full temporal context
 */
export declare function calculateTemporalContext(userId: string, alreadySurfacedThisSession?: boolean): Promise<TemporalContext>;
/**
 * Format temporal context for injection into mindstate
 */
export declare function formatTemporalForMindstate(temporal: TemporalContext): string;
//# sourceMappingURL=temporal.d.ts.map