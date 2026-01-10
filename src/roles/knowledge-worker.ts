/**
 * Knowledge Worker
 *
 * Background scheduler that periodically fetches knowledge for each role.
 * Uses node-cron for scheduling with configurable frequencies.
 */

import cron from 'node-cron';
import type { RoleKnowledgeDomain, NewsSource, FetchedItem } from './role-knowledge-domain.js';
import { fetchRss } from './fetchers/rss-fetcher.js';

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
export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  enabled: true,
  runOnStartup: false,
  hourlySchedule: '0 * * * *',      // Every hour at :00
  dailySchedule: '0 6 * * *',       // Daily at 6 AM
  weeklySchedule: '0 6 * * 0',      // Sunday at 6 AM
};

/** Callback for processing fetched items */
export type FetchCallback = (
  roleId: string,
  sourceId: string,
  items: FetchedItem[]
) => Promise<void>;

/** Error handler callback */
export type ErrorCallback = (
  roleId: string,
  sourceId: string,
  error: Error
) => void;

/**
 * Knowledge Worker for background fetching of role-specific knowledge.
 *
 * Schedules periodic fetches based on source update frequencies and
 * routes fetched items to a callback for processing (e.g., storage in Graphiti).
 */
export class KnowledgeWorker {
  private config: WorkerConfig;
  private roles: RoleKnowledgeDomain[];
  private scheduledJobs: cron.ScheduledTask[] = [];
  private onFetch: FetchCallback;
  private onError: ErrorCallback;
  private isRunning = false;

  constructor(options: {
    roles: RoleKnowledgeDomain[];
    config?: Partial<WorkerConfig>;
    onFetch: FetchCallback;
    onError?: ErrorCallback;
  }) {
    this.roles = options.roles;
    this.config = { ...DEFAULT_WORKER_CONFIG, ...options.config };
    this.onFetch = options.onFetch;
    this.onError = options.onError ?? this.defaultErrorHandler;
  }

  /**
   * Start the knowledge worker.
   * Schedules cron jobs for each frequency and optionally runs an immediate fetch.
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[KnowledgeWorker] Worker is disabled, not starting');
      return;
    }

    if (this.isRunning) {
      console.log('[KnowledgeWorker] Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('[KnowledgeWorker] Starting worker...');

    // Schedule jobs for each frequency
    this.scheduleJob('hourly', this.config.hourlySchedule);
    this.scheduleJob('daily', this.config.dailySchedule);
    this.scheduleJob('weekly', this.config.weeklySchedule);

    console.log(`[KnowledgeWorker] Scheduled ${this.scheduledJobs.length} jobs`);

    // Run immediate fetch if configured
    if (this.config.runOnStartup) {
      console.log('[KnowledgeWorker] Running startup fetch...');
      await this.fetchAll();
    }
  }

  /**
   * Stop the knowledge worker.
   * Cancels all scheduled cron jobs.
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[KnowledgeWorker] Worker is not running');
      return;
    }

    console.log('[KnowledgeWorker] Stopping worker...');

    for (const job of this.scheduledJobs) {
      job.stop();
    }
    this.scheduledJobs = [];
    this.isRunning = false;

    console.log('[KnowledgeWorker] Worker stopped');
  }

  /**
   * Check if the worker is currently running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Manually trigger a fetch for all sources.
   * Useful for testing or forced refresh.
   */
  async fetchAll(): Promise<void> {
    await this.fetchSourcesByFrequency('hourly');
    await this.fetchSourcesByFrequency('daily');
    await this.fetchSourcesByFrequency('weekly');
  }

  /**
   * Fetch sources for a specific frequency across all roles.
   */
  async fetchSourcesByFrequency(frequency: UpdateFrequency): Promise<void> {
    console.log(`[KnowledgeWorker] Fetching ${frequency} sources...`);

    for (const role of this.roles) {
      const sources = role.newsSources.filter(
        (source) => source.updateFrequency === frequency
      );

      for (const source of sources) {
        await this.fetchSource(role.roleId, source);
      }
    }

    console.log(`[KnowledgeWorker] Completed ${frequency} fetch cycle`);
  }

  /**
   * Fetch a single source and process results.
   */
  private async fetchSource(roleId: string, source: NewsSource): Promise<void> {
    try {
      console.log(`[KnowledgeWorker] Fetching ${source.name} for role ${roleId}`);

      let items: FetchedItem[];

      // Route to appropriate fetcher based on source type
      switch (source.type) {
        case 'rss':
          items = await fetchRss(source);
          break;
        case 'api':
        case 'scrape':
          // TODO: Implement API and scrape fetchers in future stories
          console.log(`[KnowledgeWorker] Skipping ${source.type} source (not implemented)`);
          return;
        default:
          console.log(`[KnowledgeWorker] Unknown source type: ${source.type}`);
          return;
      }

      console.log(`[KnowledgeWorker] Fetched ${items.length} items from ${source.name}`);

      // Pass items to callback for processing
      await this.onFetch(roleId, source.id, items);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError(roleId, source.id, err);
    }
  }

  /**
   * Schedule a cron job for a specific frequency.
   */
  private scheduleJob(frequency: UpdateFrequency, schedule: string): void {
    if (!cron.validate(schedule)) {
      console.error(`[KnowledgeWorker] Invalid cron schedule for ${frequency}: ${schedule}`);
      return;
    }

    const job = cron.schedule(schedule, async () => {
      console.log(`[KnowledgeWorker] Cron triggered for ${frequency}`);
      await this.fetchSourcesByFrequency(frequency);
    });

    this.scheduledJobs.push(job);
    console.log(`[KnowledgeWorker] Scheduled ${frequency} job: ${schedule}`);
  }

  /**
   * Default error handler that logs errors without crashing.
   */
  private defaultErrorHandler(roleId: string, sourceId: string, error: Error): void {
    console.error(
      `[KnowledgeWorker] Error fetching ${sourceId} for role ${roleId}:`,
      error.message
    );
  }
}

/**
 * Factory function for creating a KnowledgeWorker.
 * Provides a cleaner API for functional usage patterns.
 */
export function makeKnowledgeWorker(options: {
  roles: RoleKnowledgeDomain[];
  config?: Partial<WorkerConfig>;
  onFetch: FetchCallback;
  onError?: ErrorCallback;
}): KnowledgeWorker {
  return new KnowledgeWorker(options);
}
