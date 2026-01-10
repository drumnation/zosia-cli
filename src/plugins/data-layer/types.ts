/**
 * Data Layer Types
 *
 * Defines interfaces for all data sources that feed Zosia's awareness.
 */

// ============================================================================
// Cache Configuration
// ============================================================================

/** Cache TTL options based on user requirements */
export type CacheTTL = 'hourly' | 'four-hourly' | 'daily' | 'weekly';

/** Cron schedules for each TTL */
export const CACHE_SCHEDULES: Record<CacheTTL, string> = {
  hourly: '0 * * * *',           // Every hour at :00
  'four-hourly': '0 */4 * * *',  // Every 4 hours
  daily: '0 6 * * *',            // 6 AM daily
  weekly: '0 6 * * 0',           // Sunday 6 AM
};

/** Cache TTL in milliseconds */
export const CACHE_TTL_MS: Record<CacheTTL, number> = {
  hourly: 60 * 60 * 1000,              // 1 hour
  'four-hourly': 4 * 60 * 60 * 1000,   // 4 hours
  daily: 24 * 60 * 60 * 1000,          // 24 hours
  weekly: 7 * 24 * 60 * 60 * 1000,     // 7 days
};

// ============================================================================
// Data Source Framework
// ============================================================================

/** Base interface for all data sources */
export interface DataSource<T = unknown> {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  cacheTTL: CacheTTL;
  relevanceWeight: number;           // 0-1, how much to weight this data
  lastFetchedAt: Date | null;
  lastData: T | null;
  error: string | null;
}

/** Generic fetcher function type */
export type DataFetcher<T> = () => Promise<T>;

// ============================================================================
// Oura Ring Data
// ============================================================================

export interface OuraSleepData {
  score: number;                      // 0-100
  duration: number;                   // hours
  efficiency: number;                 // percentage
  latency: number;                    // minutes to fall asleep
  remSleep: number;                   // minutes
  deepSleep: number;                  // minutes
  restfulness: number;                // disturbance score
}

export interface OuraReadinessData {
  score: number;                      // 0-100
  hrv: number;                        // heart rate variability (ms)
  restingHR: number;                  // bpm
  bodyTemperature: number;            // deviation from baseline in °C
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
  bedtimeShift: number;               // minutes from usual
}

export interface OuraData {
  sleep: OuraSleepData;
  readiness: OuraReadinessData;
  activity: OuraActivityData;
  patterns: OuraPatterns;
  fetchedAt: Date;
}

// ============================================================================
// Spotify Data
// ============================================================================

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
  valence: number;                    // 0-1 (sad to happy)
  energy: number;                     // 0-1
  danceability: number;               // 0-1
}

export interface SpotifyPatterns {
  moodTrend: 'upbeat' | 'mellow' | 'mixed';
  listeningTime: string;              // e.g., "late night"
  genreShift: string | null;          // e.g., "more jazz lately"
  isKidsMusic: boolean;               // Detected Disney/kids playlists
}

export interface SpotifyData {
  recentlyPlayed: SpotifyTrack[];
  currentlyPlaying: SpotifyCurrentlyPlaying | null;
  topArtists: { name: string; genres: string[] }[];
  topTracks: { name: string; artist: string }[];
  audioFeatures: SpotifyAudioFeatures;
  patterns: SpotifyPatterns;
  fetchedAt: Date;
}

// ============================================================================
// Financial Data (Plaid)
// ============================================================================

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

// ============================================================================
// Calendar Data
// ============================================================================

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
  meetingLoad: number;                // hours of meetings today
}

export interface CalendarData {
  today: CalendarEvent[];
  upcoming: CalendarEvent[];
  custody: CustodyInfo;
  patterns: CalendarPatterns;
  fetchedAt: Date;
}

// ============================================================================
// RescueTime Data
// ============================================================================

export interface RescueTimeCategories {
  coding: number;                     // hours
  communication: number;
  entertainment: number;
  reference: number;
}

export interface RescueTimePatterns {
  productivityTrend: 'improving' | 'stable' | 'declining';
  focusTime: number;                  // uninterrupted hours
  lateNightCoding: boolean;           // after 10pm
}

export interface RescueTimeData {
  productivityScore: number;          // 0-100
  totalHours: number;
  categories: RescueTimeCategories;
  patterns: RescueTimePatterns;
  fetchedAt: Date;
}

// ============================================================================
// Gmail Data
// ============================================================================

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
  topSenders: string[];                // Most frequent senders
  emailVolume: 'low' | 'normal' | 'high';
  responseNeeded: number;              // Emails awaiting response
}

export interface GmailData {
  recentMessages: GmailMessage[];
  unreadCount: number;
  importantCount: number;
  patterns: GmailPatterns;
  fetchedAt: Date;
}

// ============================================================================
// Withings Scale Data
// ============================================================================

export interface WithingsWeight {
  weight: number;                      // kg
  fatMass: number | null;              // kg
  muscleMass: number | null;           // kg
  boneMass: number | null;             // kg
  waterPercent: number | null;         // percentage
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

// ============================================================================
// Aggregated Data Layer Context
// ============================================================================

export interface DataLayerContext {
  oura: OuraData | null;
  spotify: SpotifyData | null;
  financial: FinancialData | null;
  calendar: CalendarData | null;
  rescueTime: RescueTimeData | null;
  gmail: GmailData | null;
  withings: WithingsData | null;

  // Computed summaries
  biometricSummary: string | null;
  moodSummary: string | null;
  scheduleSummary: string | null;
  communicationSummary: string | null;

  // Last update times
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

// ============================================================================
// Plugin Configuration
// ============================================================================

export interface DataLayerConfig {
  enabled: boolean;
  runOnStartup: boolean;
  debug: boolean;

  // Per-source configuration
  sources: {
    oura: { enabled: boolean; cacheTTL: CacheTTL };
    spotify: { enabled: boolean; cacheTTL: CacheTTL };
    financial: { enabled: boolean; cacheTTL: CacheTTL };
    calendar: { enabled: boolean; cacheTTL: CacheTTL };
    rescueTime: { enabled: boolean; cacheTTL: CacheTTL };
    gmail: { enabled: boolean; cacheTTL: CacheTTL };
    withings: { enabled: boolean; cacheTTL: CacheTTL };
  };
}

export const DEFAULT_DATA_LAYER_CONFIG: DataLayerConfig = {
  enabled: true,
  runOnStartup: false,
  debug: false,

  sources: {
    oura: { enabled: true, cacheTTL: 'hourly' },
    spotify: { enabled: true, cacheTTL: 'hourly' },
    financial: { enabled: true, cacheTTL: 'weekly' },      // "Don't hit Plaid more than once a day. Probably once a week."
    calendar: { enabled: true, cacheTTL: 'hourly' },
    rescueTime: { enabled: false, cacheTTL: 'hourly' },    // Lower priority, disabled by default
    gmail: { enabled: true, cacheTTL: 'four-hourly' },     // Check email every 4 hours
    withings: { enabled: true, cacheTTL: 'daily' },        // Weight data daily is sufficient
  },
};

// ============================================================================
// Graphiti Episode Format
// ============================================================================

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
