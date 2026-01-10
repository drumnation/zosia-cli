/**
 * Data Layer Worker
 *
 * Background scheduler that periodically fetches data from configured sources.
 * Follows the KnowledgeWorker pattern from role-knowledge.
 */
import cron from 'node-cron';
import { CACHE_SCHEDULES, } from './types.js';
import { getDataLayerCache } from './cache.js';
/**
 * Data Layer Worker
 *
 * Manages background data fetching with cron schedules.
 */
export class DataLayerWorker {
    config;
    scheduledJobs = [];
    isRunning = false;
    debug;
    // Fetcher functions (injected)
    fetchers = new Map();
    // Callbacks
    onEpisode;
    onError;
    constructor(options) {
        this.config = options.config;
        this.debug = options.config.debug;
        this.onEpisode = options.onEpisode;
        this.onError = options.onError ?? this.defaultErrorHandler;
    }
    /**
     * Register a fetcher for a data source
     */
    registerFetcher(sourceId, fetcher) {
        this.fetchers.set(sourceId, fetcher);
        if (this.debug) {
            console.log(`[DataLayerWorker] Registered fetcher: ${sourceId}`);
        }
    }
    /**
     * Start the worker
     */
    async start() {
        if (!this.config.enabled) {
            if (this.debug) {
                console.log('[DataLayerWorker] Worker is disabled, not starting');
            }
            return;
        }
        if (this.isRunning) {
            if (this.debug) {
                console.log('[DataLayerWorker] Worker is already running');
            }
            return;
        }
        this.isRunning = true;
        console.log('[DataLayerWorker] Starting data layer worker...');
        // Schedule jobs for each TTL frequency
        const ttlGroups = this.groupSourcesByTTL();
        for (const [ttl, sources] of Object.entries(ttlGroups)) {
            if (sources.length > 0) {
                this.scheduleJob(ttl, sources);
            }
        }
        console.log(`[DataLayerWorker] Scheduled ${this.scheduledJobs.length} jobs`);
        // Run immediate fetch if configured
        if (this.config.runOnStartup) {
            console.log('[DataLayerWorker] Running startup fetch...');
            await this.fetchAll();
        }
    }
    /**
     * Stop the worker
     */
    stop() {
        if (!this.isRunning) {
            if (this.debug) {
                console.log('[DataLayerWorker] Worker is not running');
            }
            return;
        }
        console.log('[DataLayerWorker] Stopping worker...');
        for (const job of this.scheduledJobs) {
            job.stop();
        }
        this.scheduledJobs = [];
        this.isRunning = false;
        console.log('[DataLayerWorker] Worker stopped');
    }
    /**
     * Check if worker is running
     */
    getIsRunning() {
        return this.isRunning;
    }
    /**
     * Fetch all enabled sources
     */
    async fetchAll() {
        const sources = ['oura', 'spotify', 'calendar', 'gmail', 'withings', 'financial', 'rescueTime'];
        for (const sourceId of sources) {
            if (this.isSourceEnabled(sourceId)) {
                await this.fetchSource(sourceId);
            }
        }
    }
    /**
     * Fetch a specific source (checks cache first)
     */
    async fetchSource(sourceId) {
        const cache = getDataLayerCache({ debug: this.debug });
        const config = this.config.sources[sourceId];
        if (!config.enabled) {
            if (this.debug) {
                console.log(`[DataLayerWorker] Source ${sourceId} is disabled`);
            }
            return null;
        }
        // Check cache first
        const cached = cache.get(sourceId);
        if (cached) {
            if (this.debug) {
                console.log(`[DataLayerWorker] Using cached data for ${sourceId}`);
            }
            return cached;
        }
        // Fetch fresh data
        const fetcher = this.fetchers.get(sourceId);
        if (!fetcher) {
            if (this.debug) {
                console.log(`[DataLayerWorker] No fetcher registered for ${sourceId}`);
            }
            return null;
        }
        try {
            if (this.debug) {
                console.log(`[DataLayerWorker] Fetching ${sourceId}...`);
            }
            const data = await fetcher();
            // Cache the result
            cache.set(sourceId, data, config.cacheTTL);
            // Create and emit episode
            const episode = this.createEpisode(sourceId, data);
            if (episode) {
                await this.onEpisode(episode);
            }
            if (this.debug) {
                console.log(`[DataLayerWorker] Fetched and cached ${sourceId}`);
            }
            return data;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.onError(sourceId, err);
            return null;
        }
    }
    /**
     * Get current context from cache
     */
    getContext() {
        const cache = getDataLayerCache({ debug: this.debug });
        return {
            oura: cache.get('oura'),
            spotify: cache.get('spotify'),
            financial: cache.get('financial'),
            calendar: cache.get('calendar'),
            rescueTime: cache.get('rescueTime'),
            gmail: cache.get('gmail'),
            withings: cache.get('withings'),
            biometricSummary: this.summarizeBiometrics(cache.get('oura')),
            moodSummary: this.summarizeMood(cache.get('spotify')),
            scheduleSummary: this.summarizeSchedule(cache.get('calendar')),
            communicationSummary: this.summarizeCommunication(cache.get('gmail')),
            lastUpdated: {
                oura: cache.get('oura')?.fetchedAt ?? null,
                spotify: cache.get('spotify')?.fetchedAt ?? null,
                financial: cache.get('financial')?.fetchedAt ?? null,
                calendar: cache.get('calendar')?.fetchedAt ?? null,
                rescueTime: cache.get('rescueTime')?.fetchedAt ?? null,
                gmail: cache.get('gmail')?.fetchedAt ?? null,
                withings: cache.get('withings')?.fetchedAt ?? null,
            },
        };
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    groupSourcesByTTL() {
        const groups = {
            hourly: [],
            'four-hourly': [],
            daily: [],
            weekly: [],
        };
        const sources = ['oura', 'spotify', 'calendar', 'gmail', 'withings', 'financial', 'rescueTime'];
        for (const sourceId of sources) {
            const config = this.config.sources[sourceId];
            if (config.enabled) {
                groups[config.cacheTTL].push(sourceId);
            }
        }
        return groups;
    }
    scheduleJob(ttl, sources) {
        const schedule = CACHE_SCHEDULES[ttl];
        if (!cron.validate(schedule)) {
            console.error(`[DataLayerWorker] Invalid cron schedule for ${ttl}: ${schedule}`);
            return;
        }
        const job = cron.schedule(schedule, async () => {
            if (this.debug) {
                console.log(`[DataLayerWorker] Cron triggered for ${ttl} sources: ${sources.join(', ')}`);
            }
            for (const sourceId of sources) {
                await this.fetchSource(sourceId);
            }
        });
        this.scheduledJobs.push(job);
        console.log(`[DataLayerWorker] Scheduled ${ttl} job for: ${sources.join(', ')}`);
    }
    isSourceEnabled(sourceId) {
        return this.config.sources[sourceId]?.enabled ?? false;
    }
    createEpisode(sourceId, data) {
        const relevanceWeights = {
            oura: 0.7, // Sleep affects everything
            spotify: 0.5, // Music reveals mood
            calendar: 0.9, // High weight for custody/Father role
            gmail: 0.6, // Communication context
            withings: 0.4, // Body composition awareness
            financial: 0.3, // Low weight per user requirements
            rescueTime: 0.4, // Productivity tracking
        };
        // Generate episode content based on source
        let content;
        let pattern;
        switch (sourceId) {
            case 'oura': {
                const oura = data;
                content = this.formatOuraEpisode(oura);
                pattern = this.detectOuraPattern(oura);
                break;
            }
            case 'spotify': {
                const spotify = data;
                content = this.formatSpotifyEpisode(spotify);
                pattern = this.detectSpotifyPattern(spotify);
                break;
            }
            case 'calendar': {
                const calendar = data;
                content = this.formatCalendarEpisode(calendar);
                pattern = this.detectCalendarPattern(calendar);
                break;
            }
            case 'financial': {
                const financial = data;
                content = this.formatFinancialEpisode(financial);
                pattern = this.detectFinancialPattern(financial);
                break;
            }
            case 'rescueTime': {
                const rescueTime = data;
                content = this.formatRescueTimeEpisode(rescueTime);
                pattern = this.detectRescueTimePattern(rescueTime);
                break;
            }
            case 'gmail': {
                const gmail = data;
                content = this.formatGmailEpisode(gmail);
                pattern = this.detectGmailPattern(gmail);
                break;
            }
            case 'withings': {
                const withings = data;
                content = this.formatWithingsEpisode(withings);
                pattern = this.detectWithingsPattern(withings);
                break;
            }
            default:
                return null;
        }
        return {
            name: `data_layer_${sourceId}_update`,
            content,
            source: `${sourceId}-plugin`,
            metadata: {
                sourceId,
                dataType: sourceId,
                pattern,
                timestamp: new Date().toISOString(),
                relevanceWeight: relevanceWeights[sourceId],
            },
        };
    }
    // ============================================================================
    // Episode Formatters
    // ============================================================================
    formatOuraEpisode(data) {
        const parts = [];
        parts.push(`Sleep score: ${data.sleep.score}/100`);
        parts.push(`Readiness: ${data.readiness.score}/100`);
        parts.push(`HRV: ${data.readiness.hrv}ms`);
        if (data.patterns.sleepTrend !== 'stable') {
            parts.push(`Sleep trend: ${data.patterns.sleepTrend}`);
        }
        if (data.patterns.bedtimeShift > 30) {
            parts.push(`Bedtime shifted ${data.patterns.bedtimeShift}min later than usual`);
        }
        return parts.join('. ');
    }
    formatSpotifyEpisode(data) {
        const parts = [];
        if (data.currentlyPlaying) {
            parts.push(`Currently listening to ${data.currentlyPlaying.track} by ${data.currentlyPlaying.artist}`);
        }
        parts.push(`Mood trend: ${data.patterns.moodTrend}`);
        parts.push(`Listening time: ${data.patterns.listeningTime}`);
        if (data.patterns.genreShift) {
            parts.push(`Genre shift: ${data.patterns.genreShift}`);
        }
        return parts.join('. ');
    }
    formatCalendarEpisode(data) {
        const parts = [];
        if (data.custody.isWeekOn) {
            parts.push('Week ON (kids with Dave)');
        }
        else {
            parts.push('Week OFF');
        }
        if (data.custody.daysUntilTransition <= 2) {
            parts.push(`Custody transition in ${data.custody.daysUntilTransition} days`);
        }
        parts.push(`Day is ${data.patterns.busyLevel}`);
        if (data.today.length > 0) {
            const eventNames = data.today.slice(0, 3).map((e) => e.title).join(', ');
            parts.push(`Today: ${eventNames}`);
        }
        return parts.join('. ');
    }
    formatFinancialEpisode(data) {
        // Keep financial summaries minimal - low relevance weight
        const parts = [];
        if (data.patterns.spendingTrend !== 'normal') {
            parts.push(`Spending trend: ${data.patterns.spendingTrend}`);
        }
        if (data.patterns.unusualCategories.length > 0) {
            parts.push(`Unusual spending: ${data.patterns.unusualCategories.join(', ')}`);
        }
        return parts.length > 0 ? parts.join('. ') : 'Financial data updated (no notable changes)';
    }
    formatRescueTimeEpisode(data) {
        const parts = [];
        parts.push(`Productivity: ${data.productivityScore}%`);
        parts.push(`Focus time: ${data.patterns.focusTime}h`);
        if (data.patterns.lateNightCoding) {
            parts.push('Late night coding detected');
        }
        return parts.join('. ');
    }
    formatGmailEpisode(data) {
        const parts = [];
        parts.push(`Unread: ${data.unreadCount}`);
        parts.push(`Important unread: ${data.patterns.importantUnread}`);
        if (data.patterns.emailVolume !== 'normal') {
            parts.push(`Email volume: ${data.patterns.emailVolume}`);
        }
        if (data.patterns.responseNeeded > 0) {
            parts.push(`${data.patterns.responseNeeded} emails need response`);
        }
        return parts.join('. ');
    }
    formatWithingsEpisode(data) {
        const parts = [];
        if (data.latestMeasurement) {
            parts.push(`Weight: ${data.latestMeasurement.weight}kg`);
        }
        parts.push(`Trend: ${data.patterns.weightTrend}`);
        parts.push(`Average: ${data.patterns.averageWeight}kg`);
        return parts.join('. ');
    }
    // ============================================================================
    // Pattern Detection
    // ============================================================================
    detectOuraPattern(data) {
        if (data.sleep.score < 60 || data.patterns.sleepTrend === 'declining') {
            return 'sleep_concern';
        }
        if (data.readiness.hrv < 30 || data.patterns.hrvTrend === 'down') {
            return 'stress_indicator';
        }
        return undefined;
    }
    detectSpotifyPattern(data) {
        if (data.patterns.moodTrend === 'mellow' && data.audioFeatures.valence < 0.3) {
            return 'mood_concern';
        }
        return undefined;
    }
    detectCalendarPattern(data) {
        if (data.custody.daysUntilTransition <= 1) {
            return 'custody_transition_imminent';
        }
        if (data.patterns.busyLevel === 'heavy') {
            return 'heavy_schedule';
        }
        return undefined;
    }
    detectFinancialPattern(data) {
        if (data.patterns.spendingTrend === 'elevated') {
            return 'spending_elevated';
        }
        return undefined;
    }
    detectRescueTimePattern(data) {
        if (data.patterns.lateNightCoding) {
            return 'late_night_work';
        }
        if (data.patterns.productivityTrend === 'declining') {
            return 'productivity_declining';
        }
        return undefined;
    }
    detectGmailPattern(data) {
        if (data.patterns.importantUnread > 5) {
            return 'important_emails_piling_up';
        }
        if (data.patterns.emailVolume === 'high' && data.patterns.responseNeeded > 10) {
            return 'inbox_overwhelm';
        }
        return undefined;
    }
    detectWithingsPattern(data) {
        if (data.patterns.weightTrend === 'gaining' && data.patterns.measurementFrequency === 'daily') {
            return 'weight_increase_trend';
        }
        if (data.patterns.measurementFrequency === 'sporadic') {
            return 'inconsistent_tracking';
        }
        return undefined;
    }
    // ============================================================================
    // Summary Generators
    // ============================================================================
    summarizeBiometrics(oura) {
        if (!oura)
            return null;
        const parts = [];
        if (oura.sleep.score < 70) {
            parts.push(`sleep has been rough (${oura.sleep.score}/100)`);
        }
        if (oura.patterns.hrvTrend === 'down') {
            parts.push('HRV trending down (stress indicator)');
        }
        if (oura.patterns.bedtimeShift > 60) {
            parts.push(`bedtime shifted ${Math.round(oura.patterns.bedtimeShift / 60)}h later`);
        }
        return parts.length > 0 ? parts.join('; ') : null;
    }
    summarizeMood(spotify) {
        if (!spotify)
            return null;
        const parts = [];
        if (spotify.patterns.moodTrend === 'mellow' && spotify.audioFeatures.valence < 0.4) {
            parts.push('listening to more melancholy music');
        }
        if (spotify.patterns.genreShift) {
            parts.push(spotify.patterns.genreShift);
        }
        return parts.length > 0 ? parts.join('; ') : null;
    }
    summarizeSchedule(calendar) {
        if (!calendar)
            return null;
        const parts = [];
        if (calendar.custody.daysUntilTransition <= 2) {
            const transition = calendar.custody.isWeekOn ? 'kids leave' : 'kids arrive';
            parts.push(`${transition} in ${calendar.custody.daysUntilTransition} days`);
        }
        if (calendar.patterns.busyLevel === 'heavy') {
            parts.push('heavy meeting load today');
        }
        return parts.length > 0 ? parts.join('; ') : null;
    }
    summarizeCommunication(gmail) {
        if (!gmail)
            return null;
        const parts = [];
        if (gmail.patterns.importantUnread > 3) {
            parts.push(`${gmail.patterns.importantUnread} important emails waiting`);
        }
        if (gmail.patterns.responseNeeded > 5) {
            parts.push(`${gmail.patterns.responseNeeded} emails need response`);
        }
        if (gmail.patterns.emailVolume === 'high') {
            parts.push('high email volume today');
        }
        return parts.length > 0 ? parts.join('; ') : null;
    }
    defaultErrorHandler(sourceId, error) {
        console.error(`[DataLayerWorker] Error fetching ${sourceId}:`, error.message);
    }
}
/**
 * Factory function for creating a DataLayerWorker
 */
export function makeDataLayerWorker(options) {
    return new DataLayerWorker(options);
}
