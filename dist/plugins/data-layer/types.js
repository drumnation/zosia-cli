/**
 * Data Layer Types
 *
 * Defines interfaces for all data sources that feed Zosia's awareness.
 */
/** Cron schedules for each TTL */
export const CACHE_SCHEDULES = {
    hourly: '0 * * * *', // Every hour at :00
    'four-hourly': '0 */4 * * *', // Every 4 hours
    daily: '0 6 * * *', // 6 AM daily
    weekly: '0 6 * * 0', // Sunday 6 AM
};
/** Cache TTL in milliseconds */
export const CACHE_TTL_MS = {
    hourly: 60 * 60 * 1000, // 1 hour
    'four-hourly': 4 * 60 * 60 * 1000, // 4 hours
    daily: 24 * 60 * 60 * 1000, // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
};
export const DEFAULT_DATA_LAYER_CONFIG = {
    enabled: true,
    runOnStartup: false,
    debug: false,
    sources: {
        oura: { enabled: true, cacheTTL: 'hourly' },
        spotify: { enabled: true, cacheTTL: 'hourly' },
        financial: { enabled: true, cacheTTL: 'weekly' }, // "Don't hit Plaid more than once a day. Probably once a week."
        calendar: { enabled: true, cacheTTL: 'hourly' },
        rescueTime: { enabled: false, cacheTTL: 'hourly' }, // Lower priority, disabled by default
        gmail: { enabled: true, cacheTTL: 'four-hourly' }, // Check email every 4 hours
        withings: { enabled: true, cacheTTL: 'daily' }, // Weight data daily is sufficient
    },
};
