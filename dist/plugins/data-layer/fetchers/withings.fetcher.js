/**
 * Withings Scale Data Fetcher
 *
 * Priority: Medium-Low - "Body composition data for health awareness"
 *
 * Fetches weight, body fat, muscle mass data from Withings API.
 * Rate limit: Daily (via cache TTL) - weight data doesn't change frequently
 */
// ============================================================================
// Configuration
// ============================================================================
const WITHINGS_API_BASE = 'https://wbsapi.withings.net';
// Withings measurement types
const MEASURE_TYPE = {
    WEIGHT: 1, // Weight (kg)
    FAT_MASS: 8, // Fat Mass (kg)
    MUSCLE_MASS: 76, // Muscle Mass (kg)
    BONE_MASS: 88, // Bone Mass (kg)
    HYDRATION: 77, // Hydration (%)
};
// ============================================================================
// Fetcher Implementation
// ============================================================================
/**
 * Create a Withings scale data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeWithingsFetcher({
 *   accessToken: await brainCreds.get('withings_token'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Weight: ${data.latestMeasurement?.weight}kg`);
 * ```
 */
export function makeWithingsFetcher(config) {
    const { accessToken, debug = false } = config;
    return async () => {
        if (debug) {
            console.log('[WithingsFetcher] Fetching data from Withings API...');
        }
        try {
            // Get measurements from the last 30 days
            const startDate = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
            const endDate = Math.floor(Date.now() / 1000);
            const response = await fetch(`${WITHINGS_API_BASE}/measure?action=getmeas`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'getmeas',
                    startdate: startDate.toString(),
                    enddate: endDate.toString(),
                    category: '1', // Real measurements only (not goals)
                }),
            });
            if (!response.ok) {
                throw new Error(`Withings API error: ${response.status}`);
            }
            const data = (await response.json());
            if (data.status !== 0) {
                throw new Error(`Withings API returned error status: ${data.status}`);
            }
            // Transform measurements
            const measurements = transformMeasurements(data.body.measuregrps);
            // Get latest and detect patterns
            const latestMeasurement = measurements[0] || null;
            const patterns = detectPatterns(measurements);
            if (debug) {
                console.log(`[WithingsFetcher] Latest weight: ${latestMeasurement?.weight}kg, Trend: ${patterns.weightTrend}`);
            }
            return {
                latestMeasurement,
                recentMeasurements: measurements.slice(0, 10),
                patterns,
                fetchedAt: new Date(),
            };
        }
        catch (error) {
            if (debug) {
                console.error('[WithingsFetcher] Error:', error);
            }
            throw error;
        }
    };
}
// ============================================================================
// Data Transformers
// ============================================================================
function transformMeasurements(groups) {
    // Sort by date descending (most recent first)
    const sortedGroups = [...groups].sort((a, b) => b.date - a.date);
    return sortedGroups.map((group) => {
        const getMeasure = (type) => {
            const measure = group.measures.find((m) => m.type === type);
            if (!measure)
                return null;
            // Withings uses scientific notation: value * 10^unit
            return measure.value * Math.pow(10, measure.unit);
        };
        const weight = getMeasure(MEASURE_TYPE.WEIGHT);
        const waterPercent = getMeasure(MEASURE_TYPE.HYDRATION);
        return {
            weight: weight ?? 0,
            fatMass: getMeasure(MEASURE_TYPE.FAT_MASS),
            muscleMass: getMeasure(MEASURE_TYPE.MUSCLE_MASS),
            boneMass: getMeasure(MEASURE_TYPE.BONE_MASS),
            waterPercent: waterPercent ? waterPercent * 100 : null, // Convert to percentage
            date: new Date(group.date * 1000),
        };
    });
}
function detectPatterns(measurements) {
    if (measurements.length === 0) {
        return {
            weightTrend: 'stable',
            averageWeight: 0,
            measurementFrequency: 'sporadic',
        };
    }
    // Calculate average weight
    const weights = measurements.map((m) => m.weight).filter((w) => w > 0);
    const averageWeight = weights.length > 0 ? weights.reduce((sum, w) => sum + w, 0) / weights.length : 0;
    // Detect weight trend (compare last 7 days to previous 7 days)
    let weightTrend = 'stable';
    if (measurements.length >= 4) {
        const recent = measurements.slice(0, Math.ceil(measurements.length / 2));
        const older = measurements.slice(Math.ceil(measurements.length / 2));
        const avgRecent = recent.reduce((sum, m) => sum + m.weight, 0) / recent.length;
        const avgOlder = older.reduce((sum, m) => sum + m.weight, 0) / older.length;
        const diff = avgRecent - avgOlder;
        if (diff > 0.5)
            weightTrend = 'gaining';
        else if (diff < -0.5)
            weightTrend = 'losing';
    }
    // Detect measurement frequency
    let measurementFrequency = 'sporadic';
    if (measurements.length >= 7) {
        const firstDate = measurements[measurements.length - 1].date.getTime();
        const lastDate = measurements[0].date.getTime();
        const daySpan = (lastDate - firstDate) / (24 * 60 * 60 * 1000);
        const avgDaysBetween = daySpan / measurements.length;
        if (avgDaysBetween <= 1.5)
            measurementFrequency = 'daily';
        else if (avgDaysBetween <= 4)
            measurementFrequency = 'regular';
    }
    return {
        weightTrend,
        averageWeight: Math.round(averageWeight * 10) / 10,
        measurementFrequency,
    };
}
// ============================================================================
// Mock Implementation for Development
// ============================================================================
/**
 * Create a mock Withings fetcher for development/testing
 */
export function makeMockWithingsFetcher(options) {
    return async () => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        const baseWeight = options?.weight ?? 82.5;
        const now = new Date();
        // Generate mock measurements over the last 14 days
        const mockMeasurements = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            // Add small deterministic variance based on day (not random for test consistency)
            const variance = Math.sin(i * 0.5) * 0.2;
            // Use larger trend offset so trend is clearly visible despite variance
            const trendOffset = options?.weightTrend === 'gaining'
                ? -i * 0.15 // Older measurements are lighter (negative offset for older)
                : options?.weightTrend === 'losing'
                    ? i * 0.15 // Older measurements are heavier (positive offset for older)
                    : 0;
            mockMeasurements.push({
                weight: Math.round((baseWeight + variance + trendOffset) * 10) / 10,
                fatMass: Math.round((baseWeight * 0.2 + Math.random() * 0.5) * 10) / 10,
                muscleMass: Math.round((baseWeight * 0.4 + Math.random() * 0.3) * 10) / 10,
                boneMass: Math.round((baseWeight * 0.04) * 10) / 10,
                waterPercent: Math.round((55 + Math.random() * 5) * 10) / 10,
                date,
            });
        }
        const latestMeasurement = mockMeasurements[0];
        return {
            latestMeasurement,
            recentMeasurements: mockMeasurements.slice(0, 10),
            patterns: {
                weightTrend: options?.weightTrend ?? 'stable',
                averageWeight: baseWeight,
                measurementFrequency: options?.measurementFrequency ?? 'daily',
            },
            fetchedAt: new Date(),
        };
    };
}
