/**
 * Data Layer Types
 *
 * Defines interfaces for all data sources that feed Zosia's awareness.
 */
/** Cache TTL options based on user requirements */
export type CacheTTL = 'hourly' | 'four-hourly' | 'daily' | 'weekly';
/** Cron schedules for each TTL */
export declare const CACHE_SCHEDULES: Record<CacheTTL, string>;
/** Cache TTL in milliseconds */
export declare const CACHE_TTL_MS: Record<CacheTTL, number>;
/** Base interface for all data sources */
export interface DataSource<T = unknown> {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    cacheTTL: CacheTTL;
    relevanceWeight: number;
    lastFetchedAt: Date | null;
    lastData: T | null;
    error: string | null;
}
/** Generic fetcher function type */
export type DataFetcher<T> = () => Promise<T>;
export interface OuraSleepData {
    score: number;
    duration: number;
    efficiency: number;
    latency: number;
    remSleep: number;
    deepSleep: number;
    restfulness: number;
}
export interface OuraReadinessData {
    score: number;
    hrv: number;
    restingHR: number;
    bodyTemperature: number;
}
export interface OuraActivityData {
    score: number;
    steps: number;
    activeCalories: number;
    moveMinutes: number;
}
export interface OuraPatterns {
    sleepTrend: 'improving' | 'stable' | 'declining';
    hrvTrend: 'up' | 'stable' | 'down';
    bedtimeShift: number;
}
export interface OuraData {
    sleep: OuraSleepData;
    readiness: OuraReadinessData;
    activity: OuraActivityData;
    patterns: OuraPatterns;
    fetchedAt: Date;
}
export interface SpotifyTrack {
    track: string;
    artist: string;
    playedAt: Date;
    duration: number;
}
export interface SpotifyCurrentlyPlaying {
    track: string;
    artist: string;
    album: string;
    isPlaying: boolean;
}
export interface SpotifyAudioFeatures {
    valence: number;
    energy: number;
    danceability: number;
}
export interface SpotifyPatterns {
    moodTrend: 'upbeat' | 'mellow' | 'mixed';
    listeningTime: string;
    genreShift: string | null;
    isKidsMusic: boolean;
}
export interface SpotifyData {
    recentlyPlayed: SpotifyTrack[];
    currentlyPlaying: SpotifyCurrentlyPlaying | null;
    topArtists: {
        name: string;
        genres: string[];
    }[];
    topTracks: {
        name: string;
        artist: string;
    }[];
    audioFeatures: SpotifyAudioFeatures;
    patterns: SpotifyPatterns;
    fetchedAt: Date;
}
export interface FinancialBalances {
    checking: number;
    savings: number;
    credit: number;
}
export interface FinancialTransaction {
    description: string;
    amount: number;
    category: string;
    date: Date;
}
export interface FinancialPatterns {
    spendingTrend: 'normal' | 'elevated' | 'reduced';
    unusualCategories: string[];
    budgetStatus: 'on-track' | 'over' | 'under';
}
export interface FinancialData {
    balances: FinancialBalances;
    recentTransactions: FinancialTransaction[];
    patterns: FinancialPatterns;
    fetchedAt: Date;
}
export interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    type: 'custody' | 'work' | 'personal' | 'kids';
    location?: string;
}
export interface CustodyInfo {
    isWeekOn: boolean;
    transitionDate: Date | null;
    daysUntilTransition: number;
    nextWeekType: 'on' | 'off';
}
export interface CalendarPatterns {
    busyLevel: 'light' | 'moderate' | 'heavy';
    meetingLoad: number;
}
export interface CalendarData {
    today: CalendarEvent[];
    upcoming: CalendarEvent[];
    custody: CustodyInfo;
    patterns: CalendarPatterns;
    fetchedAt: Date;
}
export interface RescueTimeCategories {
    coding: number;
    communication: number;
    entertainment: number;
    reference: number;
}
export interface RescueTimePatterns {
    productivityTrend: 'improving' | 'stable' | 'declining';
    focusTime: number;
    lateNightCoding: boolean;
}
export interface RescueTimeData {
    productivityScore: number;
    totalHours: number;
    categories: RescueTimeCategories;
    patterns: RescueTimePatterns;
    fetchedAt: Date;
}
export interface GmailMessage {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    snippet: string;
    date: Date;
    isUnread: boolean;
    labels: string[];
}
export interface GmailPatterns {
    unreadCount: number;
    importantUnread: number;
    topSenders: string[];
    emailVolume: 'low' | 'normal' | 'high';
    responseNeeded: number;
}
export interface GmailData {
    recentMessages: GmailMessage[];
    unreadCount: number;
    importantCount: number;
    patterns: GmailPatterns;
    fetchedAt: Date;
}
export interface WithingsWeight {
    weight: number;
    fatMass: number | null;
    muscleMass: number | null;
    boneMass: number | null;
    waterPercent: number | null;
    date: Date;
}
export interface WithingsPatterns {
    weightTrend: 'gaining' | 'stable' | 'losing';
    averageWeight: number;
    measurementFrequency: 'daily' | 'regular' | 'sporadic';
}
export interface WithingsData {
    latestMeasurement: WithingsWeight | null;
    recentMeasurements: WithingsWeight[];
    patterns: WithingsPatterns;
    fetchedAt: Date;
}
export interface DataLayerContext {
    oura: OuraData | null;
    spotify: SpotifyData | null;
    financial: FinancialData | null;
    calendar: CalendarData | null;
    rescueTime: RescueTimeData | null;
    gmail: GmailData | null;
    withings: WithingsData | null;
    biometricSummary: string | null;
    moodSummary: string | null;
    scheduleSummary: string | null;
    communicationSummary: string | null;
    lastUpdated: {
        oura: Date | null;
        spotify: Date | null;
        financial: Date | null;
        calendar: Date | null;
        rescueTime: Date | null;
        gmail: Date | null;
        withings: Date | null;
    };
}
export interface DataLayerConfig {
    enabled: boolean;
    runOnStartup: boolean;
    debug: boolean;
    sources: {
        oura: {
            enabled: boolean;
            cacheTTL: CacheTTL;
        };
        spotify: {
            enabled: boolean;
            cacheTTL: CacheTTL;
        };
        financial: {
            enabled: boolean;
            cacheTTL: CacheTTL;
        };
        calendar: {
            enabled: boolean;
            cacheTTL: CacheTTL;
        };
        rescueTime: {
            enabled: boolean;
            cacheTTL: CacheTTL;
        };
        gmail: {
            enabled: boolean;
            cacheTTL: CacheTTL;
        };
        withings: {
            enabled: boolean;
            cacheTTL: CacheTTL;
        };
    };
}
export declare const DEFAULT_DATA_LAYER_CONFIG: DataLayerConfig;
export interface DataLayerEpisode {
    name: string;
    content: string;
    source: string;
    metadata: {
        sourceId: string;
        dataType: string;
        pattern?: string;
        timestamp: string;
        relevanceWeight: number;
    };
}
//# sourceMappingURL=types.d.ts.map