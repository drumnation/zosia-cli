/**
 * Data Layer Fetchers - Integration Tests
 *
 * Tests for all data layer fetchers (Oura, Spotify, Calendar, Plaid, Gmail, Withings)
 * including mock implementations and data structure validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  makeMockOuraFetcher,
  makeMockSpotifyFetcher,
  makeMockCalendarFetcher,
  makeMockPlaidFetcher,
  makeMockGmailFetcher,
  makeMockWithingsFetcher,
  makeMockRescueTimeFetcher,
} from '../src/plugins/data-layer/fetchers/index.js';

import type {
  OuraData,
  SpotifyData,
  CalendarData,
  FinancialData,
  GmailData,
  WithingsData,
  RescueTimeData,
} from '../src/plugins/data-layer/types.js';

// ============================================================================
// Oura Fetcher Tests
// ============================================================================

describe('Oura Fetcher', () => {
  describe('makeMockOuraFetcher()', () => {
    it('should return data with default values', async () => {
      const fetcher = makeMockOuraFetcher();
      const data = await fetcher();

      expect(data).toBeDefined();
      expect(data.sleep).toBeDefined();
      expect(data.readiness).toBeDefined();
      expect(data.activity).toBeDefined();
      expect(data.patterns).toBeDefined();
      expect(data.fetchedAt).toBeInstanceOf(Date);
    });

    it('should return sleep data with correct structure', async () => {
      const fetcher = makeMockOuraFetcher();
      const data = await fetcher();

      expect(data.sleep.score).toBeGreaterThanOrEqual(0);
      expect(data.sleep.score).toBeLessThanOrEqual(100);
      expect(typeof data.sleep.duration).toBe('number');
      expect(typeof data.sleep.efficiency).toBe('number');
      expect(typeof data.sleep.latency).toBe('number');
      expect(typeof data.sleep.remSleep).toBe('number');
      expect(typeof data.sleep.deepSleep).toBe('number');
      expect(typeof data.sleep.restfulness).toBe('number');
    });

    it('should return readiness data with correct structure', async () => {
      const fetcher = makeMockOuraFetcher();
      const data = await fetcher();

      expect(data.readiness.score).toBeGreaterThanOrEqual(0);
      expect(data.readiness.score).toBeLessThanOrEqual(100);
      expect(typeof data.readiness.hrv).toBe('number');
      expect(typeof data.readiness.restingHR).toBe('number');
      expect(typeof data.readiness.bodyTemperature).toBe('number');
    });

    it('should return activity data with correct structure', async () => {
      const fetcher = makeMockOuraFetcher();
      const data = await fetcher();

      expect(typeof data.activity.score).toBe('number');
      expect(typeof data.activity.steps).toBe('number');
      expect(typeof data.activity.activeCalories).toBe('number');
      expect(typeof data.activity.moveMinutes).toBe('number');
    });

    it('should return patterns with correct types', async () => {
      const fetcher = makeMockOuraFetcher();
      const data = await fetcher();

      expect(['improving', 'stable', 'declining']).toContain(data.patterns.sleepTrend);
      expect(['up', 'stable', 'down']).toContain(data.patterns.hrvTrend);
      expect(typeof data.patterns.bedtimeShift).toBe('number');
    });

    it('should respect custom sleepScore option', async () => {
      const fetcher = makeMockOuraFetcher({ sleepScore: 95 });
      const data = await fetcher();

      expect(data.sleep.score).toBe(95);
    });

    it('should respect custom readinessScore option', async () => {
      const fetcher = makeMockOuraFetcher({ readinessScore: 88 });
      const data = await fetcher();

      expect(data.readiness.score).toBe(88);
    });

    it('should respect custom sleepTrend option', async () => {
      const fetcher = makeMockOuraFetcher({ sleepTrend: 'improving' });
      const data = await fetcher();

      expect(data.patterns.sleepTrend).toBe('improving');
    });

    it('should work with declining sleep trend', async () => {
      const fetcher = makeMockOuraFetcher({ sleepTrend: 'declining' });
      const data = await fetcher();

      expect(data.patterns.sleepTrend).toBe('declining');
    });

    it('should include fetchedAt timestamp', async () => {
      const before = new Date();
      const fetcher = makeMockOuraFetcher();
      const data = await fetcher();
      const after = new Date();

      expect(data.fetchedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(data.fetchedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

// ============================================================================
// Spotify Fetcher Tests
// ============================================================================

describe('Spotify Fetcher', () => {
  describe('makeMockSpotifyFetcher()', () => {
    it('should return data with default values', async () => {
      const fetcher = makeMockSpotifyFetcher();
      const data = await fetcher();

      expect(data).toBeDefined();
      expect(data.recentlyPlayed).toBeDefined();
      expect(Array.isArray(data.recentlyPlayed)).toBe(true);
      expect(data.topArtists).toBeDefined();
      expect(data.topTracks).toBeDefined();
      expect(data.audioFeatures).toBeDefined();
      expect(data.patterns).toBeDefined();
      expect(data.fetchedAt).toBeInstanceOf(Date);
    });

    it('should return recently played tracks with correct structure', async () => {
      const fetcher = makeMockSpotifyFetcher();
      const data = await fetcher();

      expect(data.recentlyPlayed.length).toBeGreaterThan(0);
      const track = data.recentlyPlayed[0];
      expect(typeof track.track).toBe('string');
      expect(typeof track.artist).toBe('string');
      expect(track.playedAt).toBeInstanceOf(Date);
      expect(typeof track.duration).toBe('number');
    });

    it('should return audio features with correct structure', async () => {
      const fetcher = makeMockSpotifyFetcher();
      const data = await fetcher();

      expect(data.audioFeatures.valence).toBeGreaterThanOrEqual(0);
      expect(data.audioFeatures.valence).toBeLessThanOrEqual(1);
      expect(data.audioFeatures.energy).toBeGreaterThanOrEqual(0);
      expect(data.audioFeatures.energy).toBeLessThanOrEqual(1);
      expect(data.audioFeatures.danceability).toBeGreaterThanOrEqual(0);
      expect(data.audioFeatures.danceability).toBeLessThanOrEqual(1);
    });

    it('should return patterns with correct types', async () => {
      const fetcher = makeMockSpotifyFetcher();
      const data = await fetcher();

      expect(['upbeat', 'mellow', 'mixed']).toContain(data.patterns.moodTrend);
      expect(typeof data.patterns.listeningTime).toBe('string');
      expect(typeof data.patterns.isKidsMusic).toBe('boolean');
    });

    it('should return top artists with genres', async () => {
      const fetcher = makeMockSpotifyFetcher();
      const data = await fetcher();

      expect(data.topArtists.length).toBeGreaterThan(0);
      expect(typeof data.topArtists[0].name).toBe('string');
      expect(Array.isArray(data.topArtists[0].genres)).toBe(true);
    });

    it('should respect custom valence option', async () => {
      const fetcher = makeMockSpotifyFetcher({ valence: 0.85 });
      const data = await fetcher();

      expect(data.audioFeatures.valence).toBe(0.85);
    });

    it('should respect custom moodTrend option', async () => {
      const fetcher = makeMockSpotifyFetcher({ moodTrend: 'upbeat' });
      const data = await fetcher();

      expect(data.patterns.moodTrend).toBe('upbeat');
    });

    it('should respect custom isKidsMusic option', async () => {
      const fetcher = makeMockSpotifyFetcher({ isKidsMusic: true });
      const data = await fetcher();

      expect(data.patterns.isKidsMusic).toBe(true);
    });

    it('should return null currentlyPlaying by default', async () => {
      const fetcher = makeMockSpotifyFetcher();
      const data = await fetcher();

      expect(data.currentlyPlaying).toBeNull();
    });

    it('should respect custom currentlyPlaying option', async () => {
      const fetcher = makeMockSpotifyFetcher({
        currentlyPlaying: { track: 'Test Track', artist: 'Test Artist' },
      });
      const data = await fetcher();

      expect(data.currentlyPlaying).not.toBeNull();
      expect(data.currentlyPlaying!.track).toBe('Test Track');
      expect(data.currentlyPlaying!.artist).toBe('Test Artist');
      expect(data.currentlyPlaying!.isPlaying).toBe(true);
    });

    it('should include mock jazz tracks in recently played', async () => {
      const fetcher = makeMockSpotifyFetcher();
      const data = await fetcher();

      const trackNames = data.recentlyPlayed.map((t) => t.track);
      expect(trackNames).toContain('A Love Supreme');
    });
  });
});

// ============================================================================
// Calendar Fetcher Tests
// ============================================================================

describe('Calendar Fetcher', () => {
  describe('makeMockCalendarFetcher()', () => {
    it('should return data with default values', async () => {
      const fetcher = makeMockCalendarFetcher();
      const data = await fetcher();

      expect(data).toBeDefined();
      expect(Array.isArray(data.today)).toBe(true);
      expect(Array.isArray(data.upcoming)).toBe(true);
      expect(data.custody).toBeDefined();
      expect(data.patterns).toBeDefined();
      expect(data.fetchedAt).toBeInstanceOf(Date);
    });

    it('should return today events with correct structure', async () => {
      const fetcher = makeMockCalendarFetcher();
      const data = await fetcher();

      expect(data.today.length).toBeGreaterThan(0);
      const event = data.today[0];
      expect(typeof event.title).toBe('string');
      expect(event.start).toBeInstanceOf(Date);
      expect(event.end).toBeInstanceOf(Date);
      expect(['custody', 'work', 'personal', 'kids']).toContain(event.type);
    });

    it('should return custody info with correct structure', async () => {
      const fetcher = makeMockCalendarFetcher();
      const data = await fetcher();

      expect(typeof data.custody.isWeekOn).toBe('boolean');
      expect(data.custody.transitionDate).toBeInstanceOf(Date);
      expect(typeof data.custody.daysUntilTransition).toBe('number');
      expect(['on', 'off']).toContain(data.custody.nextWeekType);
    });

    it('should return patterns with correct types', async () => {
      const fetcher = makeMockCalendarFetcher();
      const data = await fetcher();

      expect(['light', 'moderate', 'heavy']).toContain(data.patterns.busyLevel);
      expect(typeof data.patterns.meetingLoad).toBe('number');
    });

    it('should respect custom isWeekOn option', async () => {
      const fetcherOn = makeMockCalendarFetcher({ isWeekOn: true });
      const dataOn = await fetcherOn();
      expect(dataOn.custody.isWeekOn).toBe(true);
      expect(dataOn.custody.nextWeekType).toBe('off');

      const fetcherOff = makeMockCalendarFetcher({ isWeekOn: false });
      const dataOff = await fetcherOff();
      expect(dataOff.custody.isWeekOn).toBe(false);
      expect(dataOff.custody.nextWeekType).toBe('on');
    });

    it('should respect custom daysUntilTransition option', async () => {
      const fetcher = makeMockCalendarFetcher({ daysUntilTransition: 5 });
      const data = await fetcher();

      expect(data.custody.daysUntilTransition).toBe(5);
    });

    it('should respect custom busyLevel option', async () => {
      const fetcher = makeMockCalendarFetcher({ busyLevel: 'heavy' });
      const data = await fetcher();

      expect(data.patterns.busyLevel).toBe('heavy');
    });

    it('should include work events in today when isWeekOn true', async () => {
      const fetcher = makeMockCalendarFetcher({ isWeekOn: true });
      const data = await fetcher();

      const workEvents = data.today.filter((e) => e.type === 'work');
      expect(workEvents.length).toBeGreaterThan(0);
    });

    it('should include kids events in upcoming when isWeekOn true', async () => {
      const fetcher = makeMockCalendarFetcher({ isWeekOn: true });
      const data = await fetcher();

      const kidsEvents = data.upcoming.filter((e) => e.type === 'kids');
      expect(kidsEvents.length).toBeGreaterThan(0);
    });

    it('should include personal events in upcoming when isWeekOn false', async () => {
      const fetcher = makeMockCalendarFetcher({ isWeekOn: false });
      const data = await fetcher();

      const personalEvents = data.upcoming.filter((e) => e.type === 'personal');
      expect(personalEvents.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Plaid/Financial Fetcher Tests
// ============================================================================

describe('Plaid Fetcher', () => {
  describe('makeMockPlaidFetcher()', () => {
    it('should return data with default values', async () => {
      const fetcher = makeMockPlaidFetcher();
      const data = await fetcher();

      expect(data).toBeDefined();
      expect(data.balances).toBeDefined();
      expect(Array.isArray(data.recentTransactions)).toBe(true);
      expect(data.patterns).toBeDefined();
      expect(data.fetchedAt).toBeInstanceOf(Date);
    });

    it('should return balances with correct structure', async () => {
      const fetcher = makeMockPlaidFetcher();
      const data = await fetcher();

      expect(typeof data.balances.checking).toBe('number');
      expect(typeof data.balances.savings).toBe('number');
      expect(typeof data.balances.credit).toBe('number');
    });

    it('should return transactions with correct structure', async () => {
      const fetcher = makeMockPlaidFetcher();
      const data = await fetcher();

      expect(data.recentTransactions.length).toBeGreaterThan(0);
      const tx = data.recentTransactions[0];
      expect(typeof tx.description).toBe('string');
      expect(typeof tx.amount).toBe('number');
      expect(typeof tx.category).toBe('string');
      expect(tx.date).toBeInstanceOf(Date);
    });

    it('should return patterns with correct types', async () => {
      const fetcher = makeMockPlaidFetcher();
      const data = await fetcher();

      expect(['normal', 'elevated', 'reduced']).toContain(data.patterns.spendingTrend);
      expect(Array.isArray(data.patterns.unusualCategories)).toBe(true);
      expect(['on-track', 'over', 'under']).toContain(data.patterns.budgetStatus);
    });

    it('should respect custom checkingBalance option', async () => {
      const fetcher = makeMockPlaidFetcher({ checkingBalance: 10000 });
      const data = await fetcher();

      expect(data.balances.checking).toBe(10000);
    });

    it('should respect custom budgetStatus option', async () => {
      const fetcher = makeMockPlaidFetcher({ budgetStatus: 'over' });
      const data = await fetcher();

      expect(data.patterns.budgetStatus).toBe('over');
    });

    it('should respect custom spendingTrend option', async () => {
      const fetcher = makeMockPlaidFetcher({ spendingTrend: 'elevated' });
      const data = await fetcher();

      expect(data.patterns.spendingTrend).toBe('elevated');
    });

    it('should have negative credit balance (indicating debt)', async () => {
      const fetcher = makeMockPlaidFetcher();
      const data = await fetcher();

      expect(data.balances.credit).toBeLessThan(0);
    });

    it('should include food category in transactions', async () => {
      const fetcher = makeMockPlaidFetcher();
      const data = await fetcher();

      const foodTx = data.recentTransactions.filter((tx) => tx.category === 'food');
      expect(foodTx.length).toBeGreaterThan(0);
    });

    it('should have default savings balance', async () => {
      const fetcher = makeMockPlaidFetcher();
      const data = await fetcher();

      expect(data.balances.savings).toBe(5000);
    });
  });
});

// ============================================================================
// Gmail Fetcher Tests
// ============================================================================

describe('Gmail Fetcher', () => {
  describe('makeMockGmailFetcher()', () => {
    it('should return data with default values', async () => {
      const fetcher = makeMockGmailFetcher();
      const data = await fetcher();

      expect(data).toBeDefined();
      expect(Array.isArray(data.recentMessages)).toBe(true);
      expect(typeof data.unreadCount).toBe('number');
      expect(typeof data.importantCount).toBe('number');
      expect(data.patterns).toBeDefined();
      expect(data.fetchedAt).toBeInstanceOf(Date);
    });

    it('should return recent messages with correct structure', async () => {
      const fetcher = makeMockGmailFetcher();
      const data = await fetcher();

      expect(data.recentMessages.length).toBeGreaterThan(0);
      const msg = data.recentMessages[0];
      expect(typeof msg.id).toBe('string');
      expect(typeof msg.threadId).toBe('string');
      expect(typeof msg.subject).toBe('string');
      expect(typeof msg.from).toBe('string');
      expect(typeof msg.snippet).toBe('string');
      expect(msg.date).toBeInstanceOf(Date);
      expect(typeof msg.isUnread).toBe('boolean');
      expect(Array.isArray(msg.labels)).toBe(true);
    });

    it('should return patterns with correct types', async () => {
      const fetcher = makeMockGmailFetcher();
      const data = await fetcher();

      expect(typeof data.patterns.unreadCount).toBe('number');
      expect(typeof data.patterns.importantUnread).toBe('number');
      expect(Array.isArray(data.patterns.topSenders)).toBe(true);
      expect(['low', 'normal', 'high']).toContain(data.patterns.emailVolume);
      expect(typeof data.patterns.responseNeeded).toBe('number');
    });

    it('should respect custom unreadCount option', async () => {
      const fetcher = makeMockGmailFetcher({ unreadCount: 50 });
      const data = await fetcher();

      expect(data.unreadCount).toBe(50);
    });

    it('should respect custom importantCount option', async () => {
      const fetcher = makeMockGmailFetcher({ importantCount: 10 });
      const data = await fetcher();

      expect(data.importantCount).toBe(10);
    });

    it('should respect custom emailVolume option', async () => {
      const fetcher = makeMockGmailFetcher({ emailVolume: 'high' });
      const data = await fetcher();

      expect(data.patterns.emailVolume).toBe('high');
    });

    it('should include messages from various senders', async () => {
      const fetcher = makeMockGmailFetcher();
      const data = await fetcher();

      const senders = data.recentMessages.map((m) => m.from);
      expect(senders.length).toBeGreaterThan(1);
      expect(senders.some((s) => s.includes('Sarah'))).toBe(true);
    });

    it('should include both read and unread messages', async () => {
      const fetcher = makeMockGmailFetcher();
      const data = await fetcher();

      const unread = data.recentMessages.filter((m) => m.isUnread);
      const read = data.recentMessages.filter((m) => !m.isUnread);
      expect(unread.length).toBeGreaterThan(0);
      expect(read.length).toBeGreaterThan(0);
    });

    it('should have top senders list', async () => {
      const fetcher = makeMockGmailFetcher();
      const data = await fetcher();

      expect(data.patterns.topSenders.length).toBeGreaterThan(0);
      expect(data.patterns.topSenders.length).toBeLessThanOrEqual(5);
    });

    it('should have messages with various labels', async () => {
      const fetcher = makeMockGmailFetcher();
      const data = await fetcher();

      const allLabels = new Set(data.recentMessages.flatMap((m) => m.labels));
      expect(allLabels.size).toBeGreaterThan(1);
      expect(allLabels.has('INBOX')).toBe(true);
    });
  });
});

// ============================================================================
// Withings Fetcher Tests
// ============================================================================

describe('Withings Fetcher', () => {
  describe('makeMockWithingsFetcher()', () => {
    it('should return data with default values', async () => {
      const fetcher = makeMockWithingsFetcher();
      const data = await fetcher();

      expect(data).toBeDefined();
      expect(data.latestMeasurement).toBeDefined();
      expect(Array.isArray(data.recentMeasurements)).toBe(true);
      expect(data.patterns).toBeDefined();
      expect(data.fetchedAt).toBeInstanceOf(Date);
    });

    it('should return latest measurement with correct structure', async () => {
      const fetcher = makeMockWithingsFetcher();
      const data = await fetcher();

      const m = data.latestMeasurement!;
      expect(typeof m.weight).toBe('number');
      expect(m.weight).toBeGreaterThan(0);
      expect(typeof m.fatMass).toBe('number');
      expect(typeof m.muscleMass).toBe('number');
      expect(typeof m.boneMass).toBe('number');
      expect(typeof m.waterPercent).toBe('number');
      expect(m.date).toBeInstanceOf(Date);
    });

    it('should return recent measurements array', async () => {
      const fetcher = makeMockWithingsFetcher();
      const data = await fetcher();

      expect(data.recentMeasurements.length).toBeGreaterThan(0);
      expect(data.recentMeasurements.length).toBeLessThanOrEqual(10);
    });

    it('should return patterns with correct types', async () => {
      const fetcher = makeMockWithingsFetcher();
      const data = await fetcher();

      expect(['gaining', 'stable', 'losing']).toContain(data.patterns.weightTrend);
      expect(typeof data.patterns.averageWeight).toBe('number');
      expect(['daily', 'regular', 'sporadic']).toContain(data.patterns.measurementFrequency);
    });

    it('should respect custom weight option', async () => {
      const fetcher = makeMockWithingsFetcher({ weight: 75.5 });
      const data = await fetcher();

      // Latest measurement should be close to the specified weight
      expect(Math.abs(data.latestMeasurement!.weight - 75.5)).toBeLessThan(1);
    });

    it('should respect custom weightTrend option', async () => {
      const fetcher = makeMockWithingsFetcher({ weightTrend: 'losing' });
      const data = await fetcher();

      expect(data.patterns.weightTrend).toBe('losing');
    });

    it('should respect custom measurementFrequency option', async () => {
      const fetcher = makeMockWithingsFetcher({ measurementFrequency: 'sporadic' });
      const data = await fetcher();

      expect(data.patterns.measurementFrequency).toBe('sporadic');
    });

    it('should have measurements sorted by date (most recent first)', async () => {
      const fetcher = makeMockWithingsFetcher();
      const data = await fetcher();

      for (let i = 1; i < data.recentMeasurements.length; i++) {
        expect(data.recentMeasurements[i - 1].date.getTime()).toBeGreaterThanOrEqual(
          data.recentMeasurements[i].date.getTime()
        );
      }
    });

    it('should have consistent body composition ratios', async () => {
      const fetcher = makeMockWithingsFetcher({ weight: 80 });
      const data = await fetcher();

      const m = data.latestMeasurement!;
      // Fat mass should be less than total weight
      expect(m.fatMass!).toBeLessThan(m.weight);
      // Muscle mass should be less than total weight
      expect(m.muscleMass!).toBeLessThan(m.weight);
      // Bone mass should be a small fraction
      expect(m.boneMass!).toBeLessThan(m.weight * 0.1);
    });

    it('should have water percentage in reasonable range', async () => {
      const fetcher = makeMockWithingsFetcher();
      const data = await fetcher();

      expect(data.latestMeasurement!.waterPercent).toBeGreaterThan(40);
      expect(data.latestMeasurement!.waterPercent).toBeLessThan(80);
    });

    it('should reflect weight trend in measurements', async () => {
      const fetcherGaining = makeMockWithingsFetcher({ weightTrend: 'gaining', weight: 80 });
      const dataGaining = await fetcherGaining();

      // Older measurements should have lower weight on average
      const recent = dataGaining.recentMeasurements.slice(0, 3);
      const older = dataGaining.recentMeasurements.slice(-3);
      const avgRecent = recent.reduce((s, m) => s + m.weight, 0) / recent.length;
      const avgOlder = older.reduce((s, m) => s + m.weight, 0) / older.length;

      // Recent should be higher than older when gaining
      expect(avgRecent).toBeGreaterThan(avgOlder);
    });
  });
});

// ============================================================================
// RescueTime Fetcher Tests
// ============================================================================

describe('RescueTime Fetcher', () => {
  describe('makeMockRescueTimeFetcher()', () => {
    it('should return data with default values', async () => {
      const fetcher = makeMockRescueTimeFetcher();
      const data = await fetcher();

      expect(data).toBeDefined();
      expect(typeof data.productivityScore).toBe('number');
      expect(typeof data.totalHours).toBe('number');
      expect(data.categories).toBeDefined();
      expect(data.patterns).toBeDefined();
      expect(data.fetchedAt).toBeInstanceOf(Date);
    });

    it('should return categories with correct structure', async () => {
      const fetcher = makeMockRescueTimeFetcher();
      const data = await fetcher();

      expect(typeof data.categories.coding).toBe('number');
      expect(typeof data.categories.communication).toBe('number');
      expect(typeof data.categories.entertainment).toBe('number');
      expect(typeof data.categories.reference).toBe('number');
    });

    it('should return patterns with correct types', async () => {
      const fetcher = makeMockRescueTimeFetcher();
      const data = await fetcher();

      expect(['improving', 'stable', 'declining']).toContain(data.patterns.productivityTrend);
      expect(typeof data.patterns.focusTime).toBe('number');
      expect(typeof data.patterns.lateNightCoding).toBe('boolean');
    });

    it('should respect custom productivityScore option', async () => {
      const fetcher = makeMockRescueTimeFetcher({ productivityScore: 95 });
      const data = await fetcher();

      expect(data.productivityScore).toBe(95);
    });

    it('should respect custom productivityTrend option', async () => {
      const fetcher = makeMockRescueTimeFetcher({ productivityTrend: 'improving' });
      const data = await fetcher();

      expect(data.patterns.productivityTrend).toBe('improving');
    });

    it('should respect custom focusTime option', async () => {
      const fetcher = makeMockRescueTimeFetcher({ focusTime: 5.5 });
      const data = await fetcher();

      expect(data.patterns.focusTime).toBe(5.5);
    });

    it('should respect custom lateNightCoding option', async () => {
      const fetcher = makeMockRescueTimeFetcher({ lateNightCoding: true });
      const data = await fetcher();

      expect(data.patterns.lateNightCoding).toBe(true);
    });

    it('should have productivity score in valid range by default', async () => {
      const fetcher = makeMockRescueTimeFetcher();
      const data = await fetcher();

      expect(data.productivityScore).toBeGreaterThanOrEqual(0);
      expect(data.productivityScore).toBeLessThanOrEqual(100);
    });

    it('should have coding as largest category by default', async () => {
      const fetcher = makeMockRescueTimeFetcher();
      const data = await fetcher();

      expect(data.categories.coding).toBeGreaterThan(data.categories.communication);
      expect(data.categories.coding).toBeGreaterThan(data.categories.entertainment);
      expect(data.categories.coding).toBeGreaterThan(data.categories.reference);
    });

    it('should have focus time less than or equal to coding hours', async () => {
      const fetcher = makeMockRescueTimeFetcher();
      const data = await fetcher();

      expect(data.patterns.focusTime).toBeLessThanOrEqual(data.categories.coding);
    });
  });
});

// ============================================================================
// Integration Tests - Multiple Fetchers
// ============================================================================

describe('Data Layer Fetchers - Integration', () => {
  it('should fetch all data sources concurrently', async () => {
    const ouraFetcher = makeMockOuraFetcher();
    const spotifyFetcher = makeMockSpotifyFetcher();
    const calendarFetcher = makeMockCalendarFetcher();
    const plaidFetcher = makeMockPlaidFetcher();
    const gmailFetcher = makeMockGmailFetcher();
    const withingsFetcher = makeMockWithingsFetcher();
    const rescueTimeFetcher = makeMockRescueTimeFetcher();

    const results = await Promise.all([
      ouraFetcher(),
      spotifyFetcher(),
      calendarFetcher(),
      plaidFetcher(),
      gmailFetcher(),
      withingsFetcher(),
      rescueTimeFetcher(),
    ]);

    expect(results).toHaveLength(7);
    expect(results[0].sleep).toBeDefined();
    expect(results[1].audioFeatures).toBeDefined();
    expect(results[2].custody).toBeDefined();
    expect(results[3].balances).toBeDefined();
    expect(results[4].recentMessages).toBeDefined();
    expect(results[5].latestMeasurement).toBeDefined();
    expect(results[6].productivityScore).toBeDefined();
  });

  it('should return timestamps close together', async () => {
    const ouraFetcher = makeMockOuraFetcher();
    const spotifyFetcher = makeMockSpotifyFetcher();

    const before = Date.now();
    const [oura, spotify] = await Promise.all([ouraFetcher(), spotifyFetcher()]);
    const after = Date.now();

    // Both should be within the test window
    expect(oura.fetchedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(oura.fetchedAt.getTime()).toBeLessThanOrEqual(after);
    expect(spotify.fetchedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(spotify.fetchedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('should work with all options combined', async () => {
    const oura = await makeMockOuraFetcher({
      sleepScore: 85,
      readinessScore: 90,
      sleepTrend: 'improving',
    })();

    const spotify = await makeMockSpotifyFetcher({
      valence: 0.75,
      moodTrend: 'upbeat',
      isKidsMusic: false,
      currentlyPlaying: { track: 'Test', artist: 'Artist' },
    })();

    const calendar = await makeMockCalendarFetcher({
      isWeekOn: true,
      daysUntilTransition: 2,
      busyLevel: 'light',
    })();

    const financial = await makeMockPlaidFetcher({
      checkingBalance: 5000,
      budgetStatus: 'on-track',
      spendingTrend: 'normal',
    })();

    // Verify all options were applied
    expect(oura.sleep.score).toBe(85);
    expect(oura.readiness.score).toBe(90);
    expect(oura.patterns.sleepTrend).toBe('improving');

    expect(spotify.audioFeatures.valence).toBe(0.75);
    expect(spotify.patterns.moodTrend).toBe('upbeat');
    expect(spotify.patterns.isKidsMusic).toBe(false);
    expect(spotify.currentlyPlaying).not.toBeNull();

    expect(calendar.custody.isWeekOn).toBe(true);
    expect(calendar.custody.daysUntilTransition).toBe(2);
    expect(calendar.patterns.busyLevel).toBe('light');

    expect(financial.balances.checking).toBe(5000);
    expect(financial.patterns.budgetStatus).toBe('on-track');
    expect(financial.patterns.spendingTrend).toBe('normal');
  });

  it('should allow repeated fetches with consistent structure', async () => {
    const fetcher = makeMockOuraFetcher({ sleepScore: 75 });

    const data1 = await fetcher();
    const data2 = await fetcher();

    // Structure should be identical
    expect(Object.keys(data1)).toEqual(Object.keys(data2));
    expect(Object.keys(data1.sleep)).toEqual(Object.keys(data2.sleep));
    expect(Object.keys(data1.patterns)).toEqual(Object.keys(data2.patterns));

    // Configured value should persist
    expect(data1.sleep.score).toBe(75);
    expect(data2.sleep.score).toBe(75);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Data Layer Fetchers - Edge Cases', () => {
  it('should handle edge sleep score of 0', async () => {
    const fetcher = makeMockOuraFetcher({ sleepScore: 0 });
    const data = await fetcher();

    expect(data.sleep.score).toBe(0);
  });

  it('should handle edge sleep score of 100', async () => {
    const fetcher = makeMockOuraFetcher({ sleepScore: 100 });
    const data = await fetcher();

    expect(data.sleep.score).toBe(100);
  });

  it('should handle edge valence of 0', async () => {
    const fetcher = makeMockSpotifyFetcher({ valence: 0 });
    const data = await fetcher();

    expect(data.audioFeatures.valence).toBe(0);
  });

  it('should handle edge valence of 1', async () => {
    const fetcher = makeMockSpotifyFetcher({ valence: 1 });
    const data = await fetcher();

    expect(data.audioFeatures.valence).toBe(1);
  });

  it('should handle edge checking balance of 0', async () => {
    const fetcher = makeMockPlaidFetcher({ checkingBalance: 0 });
    const data = await fetcher();

    expect(data.balances.checking).toBe(0);
  });

  it('should handle days until transition of 0', async () => {
    const fetcher = makeMockCalendarFetcher({ daysUntilTransition: 0 });
    const data = await fetcher();

    expect(data.custody.daysUntilTransition).toBe(0);
  });

  it('should handle very high checking balance', async () => {
    const fetcher = makeMockPlaidFetcher({ checkingBalance: 1000000 });
    const data = await fetcher();

    expect(data.balances.checking).toBe(1000000);
  });
});
