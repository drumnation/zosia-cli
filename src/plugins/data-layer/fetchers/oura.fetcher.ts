/**
 * Oura Ring Data Fetcher
 *
 * Priority 1: "Highest signal-to-noise for bonding (sleep affects everything)"
 *
 * Fetches sleep, readiness, and activity data from Oura API.
 * Rate limit: Hourly (via cache TTL)
 */

import type {
  OuraData,
  OuraSleepData,
  OuraReadinessData,
  OuraActivityData,
  OuraPatterns,
} from '../types.js';

// ============================================================================
// Configuration
// ============================================================================

const OURA_API_BASE = 'https://api.ouraring.com/v2';

interface OuraFetcherConfig {
  accessToken: string;
  debug?: boolean;
}

// ============================================================================
// API Response Types (from Oura API v2)
// ============================================================================

interface OuraApiSleepData {
  id: string;
  day: string;
  score: number;
  total_sleep_duration: number;
  efficiency: number;
  latency: number;
  rem_sleep_duration: number;
  deep_sleep_duration: number;
  restlessness: number;
}

interface OuraApiReadinessData {
  id: string;
  day: string;
  score: number;
  hrv_balance: number;
  resting_heart_rate: number;
  body_temperature: number;
}

interface OuraApiActivityData {
  id: string;
  day: string;
  score: number;
  steps: number;
  active_calories: number;
  equivalent_walking_distance: number;
}

// ============================================================================
// Fetcher Implementation
// ============================================================================

/**
 * Create an Oura Ring data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeOuraFetcher({
 *   accessToken: await brainCreds.get('oura_token'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Sleep score: ${data.sleep.score}`);
 * ```
 */
export function makeOuraFetcher(config: OuraFetcherConfig): () => Promise<OuraData> {
  const { accessToken, debug = false } = config;

  return async (): Promise<OuraData> => {
    if (debug) {
      console.log('[OuraFetcher] Fetching data from Oura API...');
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      // Fetch all data types in parallel
      const [sleepResponse, readinessResponse, activityResponse] = await Promise.all([
        fetch(`${OURA_API_BASE}/usercollection/daily_sleep?start_date=${yesterday}&end_date=${today}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch(`${OURA_API_BASE}/usercollection/daily_readiness?start_date=${yesterday}&end_date=${today}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch(`${OURA_API_BASE}/usercollection/daily_activity?start_date=${yesterday}&end_date=${today}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      ]);

      if (!sleepResponse.ok || !readinessResponse.ok || !activityResponse.ok) {
        throw new Error(`Oura API error: sleep=${sleepResponse.status}, readiness=${readinessResponse.status}, activity=${activityResponse.status}`);
      }

      const [sleepData, readinessData, activityData] = await Promise.all([
        sleepResponse.json() as Promise<{ data: OuraApiSleepData[] }>,
        readinessResponse.json() as Promise<{ data: OuraApiReadinessData[] }>,
        activityResponse.json() as Promise<{ data: OuraApiActivityData[] }>,
      ]);

      // Get most recent data point for each category
      const latestSleep = sleepData.data[sleepData.data.length - 1];
      const latestReadiness = readinessData.data[readinessData.data.length - 1];
      const latestActivity = activityData.data[activityData.data.length - 1];

      // Transform to our format
      const sleep = transformSleepData(latestSleep);
      const readiness = transformReadinessData(latestReadiness);
      const activity = transformActivityData(latestActivity);
      const patterns = detectPatterns(sleepData.data, readinessData.data);

      if (debug) {
        console.log(`[OuraFetcher] Sleep score: ${sleep.score}, Readiness: ${readiness.score}`);
      }

      return {
        sleep,
        readiness,
        activity,
        patterns,
        fetchedAt: new Date(),
      };
    } catch (error) {
      if (debug) {
        console.error('[OuraFetcher] Error:', error);
      }
      throw error;
    }
  };
}

// ============================================================================
// Data Transformers
// ============================================================================

function transformSleepData(raw: OuraApiSleepData | undefined): OuraSleepData {
  if (!raw) {
    return {
      score: 0,
      duration: 0,
      efficiency: 0,
      latency: 0,
      remSleep: 0,
      deepSleep: 0,
      restfulness: 0,
    };
  }

  return {
    score: raw.score,
    duration: raw.total_sleep_duration / 3600, // Convert seconds to hours
    efficiency: raw.efficiency,
    latency: raw.latency / 60, // Convert seconds to minutes
    remSleep: raw.rem_sleep_duration / 60, // Convert to minutes
    deepSleep: raw.deep_sleep_duration / 60,
    restfulness: 100 - raw.restlessness, // Invert restlessness to restfulness
  };
}

function transformReadinessData(raw: OuraApiReadinessData | undefined): OuraReadinessData {
  if (!raw) {
    return {
      score: 0,
      hrv: 0,
      restingHR: 0,
      bodyTemperature: 0,
    };
  }

  return {
    score: raw.score,
    hrv: raw.hrv_balance,
    restingHR: raw.resting_heart_rate,
    bodyTemperature: raw.body_temperature,
  };
}

function transformActivityData(raw: OuraApiActivityData | undefined): OuraActivityData {
  if (!raw) {
    return {
      score: 0,
      steps: 0,
      activeCalories: 0,
      moveMinutes: 0,
    };
  }

  return {
    score: raw.score,
    steps: raw.steps,
    activeCalories: raw.active_calories,
    moveMinutes: Math.round(raw.equivalent_walking_distance / 80), // Rough estimate
  };
}

function detectPatterns(
  sleepHistory: OuraApiSleepData[],
  readinessHistory: OuraApiReadinessData[]
): OuraPatterns {
  // Analyze sleep trend
  let sleepTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (sleepHistory.length >= 3) {
    const recent = sleepHistory.slice(-3);
    const avgRecent = recent.reduce((sum, d) => sum + d.score, 0) / recent.length;
    const avgPrevious = sleepHistory.slice(-7, -3).reduce((sum, d) => sum + d.score, 0) / Math.min(4, sleepHistory.length - 3) || avgRecent;

    if (avgRecent > avgPrevious + 5) sleepTrend = 'improving';
    else if (avgRecent < avgPrevious - 5) sleepTrend = 'declining';
  }

  // Analyze HRV trend
  let hrvTrend: 'up' | 'stable' | 'down' = 'stable';
  if (readinessHistory.length >= 3) {
    const recent = readinessHistory.slice(-3);
    const avgRecent = recent.reduce((sum, d) => sum + d.hrv_balance, 0) / recent.length;
    const avgPrevious = readinessHistory.slice(-7, -3).reduce((sum, d) => sum + d.hrv_balance, 0) / Math.min(4, readinessHistory.length - 3) || avgRecent;

    if (avgRecent > avgPrevious + 3) hrvTrend = 'up';
    else if (avgRecent < avgPrevious - 3) hrvTrend = 'down';
  }

  // Detect bedtime shift (would need sleep period data)
  // For now, return 0
  const bedtimeShift = 0;

  return {
    sleepTrend,
    hrvTrend,
    bedtimeShift,
  };
}

// ============================================================================
// Mock Implementation for Development
// ============================================================================

/**
 * Create a mock Oura fetcher for development/testing
 */
export function makeMockOuraFetcher(options?: {
  sleepScore?: number;
  readinessScore?: number;
  sleepTrend?: 'improving' | 'stable' | 'declining';
}): () => Promise<OuraData> {
  return async (): Promise<OuraData> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      sleep: {
        score: options?.sleepScore ?? 72,
        duration: 6.5,
        efficiency: 85,
        latency: 15,
        remSleep: 90,
        deepSleep: 45,
        restfulness: 80,
      },
      readiness: {
        score: options?.readinessScore ?? 75,
        hrv: 42,
        restingHR: 58,
        bodyTemperature: 0.1,
      },
      activity: {
        score: 65,
        steps: 4500,
        activeCalories: 250,
        moveMinutes: 45,
      },
      patterns: {
        sleepTrend: options?.sleepTrend ?? 'stable',
        hrvTrend: 'stable',
        bedtimeShift: 30,
      },
      fetchedAt: new Date(),
    };
  };
}
