/**
 * RescueTime Data Fetcher
 *
 * Priority: Low - "Productivity tracking for work pattern awareness"
 * Disabled by default per user preference.
 *
 * Fetches productivity scores, categories, and focus time from RescueTime API.
 * Rate limit: Hourly (via cache TTL) when enabled
 */
// ============================================================================
// Configuration
// ============================================================================
const RESCUETIME_API_BASE = 'https://www.rescuetime.com/anapi';
// ============================================================================
// Fetcher Implementation
// ============================================================================
/**
 * Create a RescueTime data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeRescueTimeFetcher({
 *   apiKey: await brainCreds.get('rescuetime_api_key'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Productivity score: ${data.productivityScore}`);
 * ```
 */
export function makeRescueTimeFetcher(config) {
    const { apiKey, debug = false } = config;
    return async () => {
        if (debug) {
            console.log('[RescueTimeFetcher] Fetching data from RescueTime API...');
        }
        try {
            const today = new Date().toISOString().split('T')[0];
            // Fetch daily summary and activity breakdown in parallel
            const [summaryResponse, dailyResponse] = await Promise.all([
                fetch(`${RESCUETIME_API_BASE}/data?key=${apiKey}&format=json&resolution_time=day&restrict_begin=${today}&restrict_end=${today}&restrict_kind=overview`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(`${RESCUETIME_API_BASE}/daily_summary_feed?key=${apiKey}&format=json`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
            ]);
            if (!summaryResponse.ok || !dailyResponse.ok) {
                throw new Error(`RescueTime API error: summary=${summaryResponse.status}, daily=${dailyResponse.status}`);
            }
            const [summaryData, dailyData] = await Promise.all([
                summaryResponse.json(),
                dailyResponse.json(),
            ]);
            // Transform to our format (with null-safe fallbacks)
            const summaryRows = summaryData?.rows ?? [];
            const categories = transformCategories(summaryRows);
            const totalHours = calculateTotalHours(summaryRows);
            const productivityScore = extractProductivityScore(dailyData);
            const patterns = detectPatterns(summaryRows, dailyData);
            if (debug) {
                console.log(`[RescueTimeFetcher] Productivity: ${productivityScore}, Total hours: ${totalHours.toFixed(1)}`);
            }
            return {
                productivityScore,
                totalHours,
                categories,
                patterns,
                fetchedAt: new Date(),
            };
        }
        catch (error) {
            if (debug) {
                console.error('[RescueTimeFetcher] Error:', error);
            }
            throw error;
        }
    };
}
// ============================================================================
// Data Transformers
// ============================================================================
function transformCategories(rows) {
    const categories = {
        coding: 0,
        communication: 0,
        entertainment: 0,
        reference: 0,
    };
    for (const row of rows) {
        const [, timeSeconds, , , category] = row;
        // Skip rows with missing category data
        if (!category || typeof category !== 'string')
            continue;
        const hours = timeSeconds / 3600;
        // Map RescueTime categories to our simplified categories
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('software development') ||
            categoryLower.includes('editing') ||
            categoryLower.includes('design')) {
            categories.coding += hours;
        }
        else if (categoryLower.includes('communication') ||
            categoryLower.includes('email') ||
            categoryLower.includes('messaging')) {
            categories.communication += hours;
        }
        else if (categoryLower.includes('entertainment') ||
            categoryLower.includes('social') ||
            categoryLower.includes('gaming')) {
            categories.entertainment += hours;
        }
        else if (categoryLower.includes('reference') ||
            categoryLower.includes('learning') ||
            categoryLower.includes('news')) {
            categories.reference += hours;
        }
    }
    return {
        coding: Math.round(categories.coding * 100) / 100,
        communication: Math.round(categories.communication * 100) / 100,
        entertainment: Math.round(categories.entertainment * 100) / 100,
        reference: Math.round(categories.reference * 100) / 100,
    };
}
function calculateTotalHours(rows) {
    let totalSeconds = 0;
    for (const row of rows) {
        const timeSeconds = row[1];
        if (typeof timeSeconds === 'number') {
            totalSeconds += timeSeconds;
        }
    }
    return Math.round((totalSeconds / 3600) * 100) / 100;
}
function extractProductivityScore(dailyData) {
    // Daily summary feed returns most recent days first
    // productivity_pulse is already 0-100
    const rows = dailyData?.rows ?? [];
    if (rows.length > 0 && rows[0] && typeof rows[0][1] === 'number') {
        return rows[0][1]; // productivity_pulse is index 1
    }
    return 0;
}
function detectPatterns(summaryRows, dailyData) {
    // Analyze productivity trend from daily data
    let productivityTrend = 'stable';
    const dailyRows = dailyData?.rows ?? [];
    if (dailyRows.length >= 7) {
        const recent = dailyRows.slice(0, 3);
        const older = dailyRows.slice(4, 7);
        const avgRecent = recent.reduce((sum, r) => sum + (r?.[1] ?? 0), 0) / recent.length;
        const avgOlder = older.reduce((sum, r) => sum + (r?.[1] ?? 0), 0) / older.length;
        if (avgRecent > avgOlder + 5)
            productivityTrend = 'improving';
        else if (avgRecent < avgOlder - 5)
            productivityTrend = 'declining';
    }
    // Calculate focus time (time on highly productive activities)
    let focusTimeSeconds = 0;
    for (const row of summaryRows) {
        const productivity = row[5]; // productivity score -2 to 2
        const timeSeconds = row[1]; // time_spent_seconds
        if (typeof productivity === 'number' && productivity >= 1 && typeof timeSeconds === 'number') {
            focusTimeSeconds += timeSeconds;
        }
    }
    const focusTime = Math.round((focusTimeSeconds / 3600) * 100) / 100;
    // Detect late night coding (this would require more detailed time data)
    // For now, default to false - would need hourly breakdown to detect
    const lateNightCoding = false;
    return {
        productivityTrend,
        focusTime,
        lateNightCoding,
    };
}
// ============================================================================
// Mock Implementation for Development
// ============================================================================
/**
 * Create a mock RescueTime fetcher for development/testing
 */
export function makeMockRescueTimeFetcher(options) {
    return async () => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
            productivityScore: options?.productivityScore ?? 72,
            totalHours: 6.5,
            categories: {
                coding: 4.2,
                communication: 1.5,
                entertainment: 0.3,
                reference: 0.5,
            },
            patterns: {
                productivityTrend: options?.productivityTrend ?? 'stable',
                focusTime: options?.focusTime ?? 3.5,
                lateNightCoding: options?.lateNightCoding ?? false,
            },
            fetchedAt: new Date(),
        };
    };
}
