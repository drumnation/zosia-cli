/**
 * Data Layer Worker
 *
 * Background scheduler that periodically fetches data from configured sources.
 * Follows the KnowledgeWorker pattern from role-knowledge.
 */
import { type DataLayerConfig, type DataLayerContext, type DataLayerEpisode } from './types.js';
type SourceId = 'oura' | 'spotify' | 'financial' | 'calendar' | 'rescueTime' | 'gmail' | 'withings';
/** Fetcher function type */
type SourceFetcher<T> = () => Promise<T>;
/** Episode callback type */
type EpisodeCallback = (episode: DataLayerEpisode) => Promise<void>;
/** Error callback type */
type ErrorCallback = (sourceId: SourceId, error: Error) => void;
/**
 * Data Layer Worker
 *
 * Manages background data fetching with cron schedules.
 */
export declare class DataLayerWorker {
    private config;
    private scheduledJobs;
    private isRunning;
    private debug;
    private fetchers;
    private onEpisode;
    private onError;
    constructor(options: {
        config: DataLayerConfig;
        onEpisode: EpisodeCallback;
        onError?: ErrorCallback;
    });
    /**
     * Register a fetcher for a data source
     */
    registerFetcher<T>(sourceId: SourceId, fetcher: SourceFetcher<T>): void;
    /**
     * Start the worker
     */
    start(): Promise<void>;
    /**
     * Stop the worker
     */
    stop(): void;
    /**
     * Check if worker is running
     */
    getIsRunning(): boolean;
    /**
     * Fetch all enabled sources
     */
    fetchAll(): Promise<void>;
    /**
     * Fetch a specific source (checks cache first)
     */
    fetchSource(sourceId: SourceId): Promise<unknown | null>;
    /**
     * Get current context from cache
     */
    getContext(): DataLayerContext;
    private groupSourcesByTTL;
    private scheduleJob;
    private isSourceEnabled;
    private createEpisode;
    private formatOuraEpisode;
    private formatSpotifyEpisode;
    private formatCalendarEpisode;
    private formatFinancialEpisode;
    private formatRescueTimeEpisode;
    private formatGmailEpisode;
    private formatWithingsEpisode;
    private detectOuraPattern;
    private detectSpotifyPattern;
    private detectCalendarPattern;
    private detectFinancialPattern;
    private detectRescueTimePattern;
    private detectGmailPattern;
    private detectWithingsPattern;
    private summarizeBiometrics;
    private summarizeMood;
    private summarizeSchedule;
    private summarizeCommunication;
    private defaultErrorHandler;
}
/**
 * Factory function for creating a DataLayerWorker
 */
export declare function makeDataLayerWorker(options: {
    config: DataLayerConfig;
    onEpisode: EpisodeCallback;
    onError?: ErrorCallback;
}): DataLayerWorker;
export {};
//# sourceMappingURL=worker.d.ts.map