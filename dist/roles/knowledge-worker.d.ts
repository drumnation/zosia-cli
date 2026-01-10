/**
 * Knowledge Worker
 *
 * Background scheduler that periodically fetches knowledge for each role.
 * Uses node-cron for scheduling with configurable frequencies.
 */
import type { RoleKnowledgeDomain, FetchedItem } from './role-knowledge-domain.js';
/** Update frequency options */
type UpdateFrequency = 'hourly' | 'daily' | 'weekly';
/** Worker configuration */
export interface WorkerConfig {
    /** Whether the worker is enabled */
    enabled: boolean;
    /** Whether to run an immediate fetch on startup */
    runOnStartup: boolean;
    /** Cron expression for hourly sources (default: every hour at :00) */
    hourlySchedule: string;
    /** Cron expression for daily sources (default: 6 AM) */
    dailySchedule: string;
    /** Cron expression for weekly sources (default: Sunday 6 AM) */
    weeklySchedule: string;
}
/** Default worker configuration */
export declare const DEFAULT_WORKER_CONFIG: WorkerConfig;
/** Callback for processing fetched items */
export type FetchCallback = (roleId: string, sourceId: string, items: FetchedItem[]) => Promise<void>;
/** Error handler callback */
export type ErrorCallback = (roleId: string, sourceId: string, error: Error) => void;
/**
 * Knowledge Worker for background fetching of role-specific knowledge.
 *
 * Schedules periodic fetches based on source update frequencies and
 * routes fetched items to a callback for processing (e.g., storage in Graphiti).
 */
export declare class KnowledgeWorker {
    private config;
    private roles;
    private scheduledJobs;
    private onFetch;
    private onError;
    private isRunning;
    constructor(options: {
        roles: RoleKnowledgeDomain[];
        config?: Partial<WorkerConfig>;
        onFetch: FetchCallback;
        onError?: ErrorCallback;
    });
    /**
     * Start the knowledge worker.
     * Schedules cron jobs for each frequency and optionally runs an immediate fetch.
     */
    start(): Promise<void>;
    /**
     * Stop the knowledge worker.
     * Cancels all scheduled cron jobs.
     */
    stop(): void;
    /**
     * Check if the worker is currently running.
     */
    getIsRunning(): boolean;
    /**
     * Manually trigger a fetch for all sources.
     * Useful for testing or forced refresh.
     */
    fetchAll(): Promise<void>;
    /**
     * Fetch sources for a specific frequency across all roles.
     */
    fetchSourcesByFrequency(frequency: UpdateFrequency): Promise<void>;
    /**
     * Fetch a single source and process results.
     */
    private fetchSource;
    /**
     * Schedule a cron job for a specific frequency.
     */
    private scheduleJob;
    /**
     * Default error handler that logs errors without crashing.
     */
    private defaultErrorHandler;
}
/**
 * Factory function for creating a KnowledgeWorker.
 * Provides a cleaner API for functional usage patterns.
 */
export declare function makeKnowledgeWorker(options: {
    roles: RoleKnowledgeDomain[];
    config?: Partial<WorkerConfig>;
    onFetch: FetchCallback;
    onError?: ErrorCallback;
}): KnowledgeWorker;
export {};
//# sourceMappingURL=knowledge-worker.d.ts.map