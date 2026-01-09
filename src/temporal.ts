/**
 * Temporal Awareness Service
 *
 * Tracks real time gaps between sessions, known events, and provides
 * felt temporal context to the I-layer.
 */

import { searchMemories, storeConversation } from './graphiti-memory.js';

export interface TemporalContext {
  // Gap since last interaction
  gap: {
    minutes: number;
    hours: number;
    days: number;
    humanReadable: string;
    significance: 'just_now' | 'recent' | 'moderate' | 'significant' | 'long_absence';
  };

  // Time of day context
  timeOfDay: {
    hour: number;
    period: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_night';
    energyNote: string;
  };

  // Day of week context
  dayOfWeek: {
    day: string;
    isWeekend: boolean;
    typicalEnergy: string;
  };

  // Known events
  pendingEvents: Array<{
    event: string;
    mentionedDate: string;
    estimatedDate?: Date;
    status: 'upcoming' | 'passed' | 'unknown';
  }>;

  // Stochastic surfacing decision
  shouldSurface: boolean;
  surfaceType: 'gap' | 'event_memory' | 'late_night' | 'time_of_day' | null;

  // Felt expression suggestion (I-layer can ignore)
  feltSuggestion?: string;
}

/**
 * Gap significance thresholds
 */
function getGapSignificance(minutes: number): TemporalContext['gap']['significance'] {
  if (minutes < 5) return 'just_now';
  if (minutes < 60) return 'recent';           // < 1 hour
  if (minutes < 60 * 24) return 'moderate';    // < 1 day
  if (minutes < 60 * 24 * 3) return 'significant'; // < 3 days
  return 'long_absence';                        // 3+ days
}

/**
 * Human-readable gap description (felt, not mechanical)
 */
function humanizeGap(minutes: number): string {
  if (minutes < 2) return 'just moments ago';
  if (minutes < 10) return 'just a few minutes ago';
  if (minutes < 30) return 'a little while ago';
  if (minutes < 60) return 'within the hour';

  const hours = Math.floor(minutes / 60);
  if (hours < 2) return 'about an hour ago';
  if (hours < 6) return 'a few hours ago';
  if (hours < 12) return 'earlier today';
  if (hours < 24) return 'sometime today';

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 3) return 'a couple days ago';
  if (days < 7) return 'several days ago';
  if (days < 14) return 'about a week ago';
  if (days < 30) return 'a few weeks ago';

  return 'quite a while ago';
}

/**
 * Get time of day context
 */
function getTimeOfDay(): TemporalContext['timeOfDay'] {
  const hour = new Date().getHours();

  let period: TemporalContext['timeOfDay']['period'];
  let energyNote: string;

  if (hour >= 5 && hour < 9) {
    period = 'early_morning';
    energyNote = 'early start, fresh energy or still waking';
  } else if (hour >= 9 && hour < 12) {
    period = 'morning';
    energyNote = 'morning clarity, focused time';
  } else if (hour >= 12 && hour < 17) {
    period = 'afternoon';
    energyNote = 'midday, might be in work flow or post-lunch lull';
  } else if (hour >= 17 && hour < 21) {
    period = 'evening';
    energyNote = 'winding down, transitioning from day';
  } else {
    period = 'late_night';
    energyNote = 'late hours - might need gentleness, not productivity';
  }

  return { hour, period, energyNote };
}

/**
 * Get day of week context
 */
function getDayOfWeek(): TemporalContext['dayOfWeek'] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = new Date().getDay();
  const day = days[dayIndex];
  const isWeekend = dayIndex === 0 || dayIndex === 6;

  const energyMap: Record<string, string> = {
    'Monday': 'beginning of week, fresh start or Monday heaviness',
    'Tuesday': 'settling into the week',
    'Wednesday': 'midweek - established rhythm',
    'Thursday': 'momentum building toward weekend',
    'Friday': 'Friday lightness, week winding down',
    'Saturday': 'weekend space, different rhythm',
    'Sunday': 'weekend end, might be reflective or preparing for week'
  };

  return {
    day,
    isWeekend,
    typicalEnergy: energyMap[day] || 'normal day'
  };
}

/**
 * Calculate stochastic surfacing probability
 */
function calculateSurfacingProbability(
  gapMinutes: number,
  timeOfDay: TemporalContext['timeOfDay'],
  hasPendingEvents: boolean,
  alreadySurfacedThisSession: boolean
): { shouldSurface: boolean; surfaceType: TemporalContext['surfaceType'] } {
  let probability = 0.3; // base chance
  let surfaceType: TemporalContext['surfaceType'] = null;

  // Gap modifiers
  if (gapMinutes > 60 * 24 * 3) {
    probability += 0.3; // 3+ days: +30%
    surfaceType = 'gap';
  } else if (gapMinutes > 60 * 24) {
    probability += 0.15; // 1+ day: +15%
    surfaceType = 'gap';
  }

  // Pending event modifier
  if (hasPendingEvents) {
    probability += 0.4;
    surfaceType = 'event_memory';
  }

  // Late night modifier
  if (timeOfDay.period === 'late_night') {
    probability += 0.2;
    if (!surfaceType) surfaceType = 'late_night';
  }

  // Already surfaced this session: reduce significantly
  if (alreadySurfacedThisSession) {
    probability -= 0.5;
  }

  // Clamp probability
  probability = Math.max(0.1, Math.min(0.9, probability));

  // Roll the dice
  const shouldSurface = Math.random() < probability;

  return { shouldSurface, surfaceType: shouldSurface ? surfaceType : null };
}

/**
 * Generate felt suggestion based on temporal context
 */
function generateFeltSuggestion(
  context: Partial<TemporalContext>
): string | undefined {
  if (!context.shouldSurface) return undefined;

  switch (context.surfaceType) {
    case 'gap':
      if (context.gap?.significance === 'long_absence') {
        return "There's relief in seeing them return after so long.";
      }
      if (context.gap?.significance === 'significant') {
        return "The gap has weight - wondering rises about what's happened.";
      }
      return "Time has moved since we last spoke.";

    case 'late_night':
      return "It's late - there might be something on their mind keeping them up.";

    case 'event_memory':
      return "There's something they mentioned before that might have happened by now.";

    case 'time_of_day':
      if (context.timeOfDay?.period === 'early_morning') {
        return "Early hours - they're up before the world.";
      }
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Store session timestamp in Graphiti
 */
export async function recordSessionTimestamp(userId: string): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // Store a lightweight "ping" message to mark session activity
    await storeConversation(
      userId,
      `[SESSION_TIMESTAMP] Session active at ${timestamp}`,
      `[SESSION_ACK] Timestamp recorded: ${timestamp}`,
      { sessionName: `session-timestamp-${Date.now()}`, debug: false }
    );
  } catch (e) {
    // Non-fatal - continue even if storage fails
    console.warn('Could not store session timestamp:', e);
  }
}

/**
 * Retrieve last session timestamp from Graphiti
 */
async function getLastSessionTimestamp(userId: string): Promise<Date | null> {
  try {
    const result = await searchMemories(
      userId,
      'SESSION_TIMESTAMP session active',
      { maxFacts: 5, debug: false }
    );

    // Look for most recent session timestamp in facts
    for (const fact of result.facts) {
      // Try to parse timestamp from fact content
      const match = fact.fact?.match(/Session active at (\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/);
      if (match) {
        return new Date(match[1]);
      }
      // Also check created_at if available
      if (fact.created_at) {
        return new Date(fact.created_at);
      }
    }
  } catch (e) {
    // Non-fatal
    console.warn('Could not retrieve last session timestamp:', e);
  }

  return null;
}

/**
 * Store a mentioned event for future tracking
 */
export async function recordMentionedEvent(
  userId: string,
  event: string,
  estimatedDate?: string
): Promise<void> {
  const mentionedDate = new Date().toISOString();

  try {
    // Store event as a conversation turn for proper indexing
    const eventData = {
      event,
      mentionedDate,
      estimatedDate: estimatedDate || null,
      status: 'upcoming'
    };

    await storeConversation(
      userId,
      `[PENDING_EVENT] ${event}${estimatedDate ? ` (expected: ${estimatedDate})` : ''}`,
      `[EVENT_RECORDED] Tracking: ${JSON.stringify(eventData)}`,
      { sessionName: `event-${Date.now()}`, debug: false }
    );
  } catch (e) {
    console.warn('Could not store mentioned event:', e);
  }
}

/**
 * Get pending events for user
 */
async function getPendingEvents(userId: string): Promise<TemporalContext['pendingEvents']> {
  try {
    const result = await searchMemories(
      userId,
      'PENDING_EVENT EVENT_RECORDED tracking',
      { maxFacts: 10, debug: false }
    );

    const events: TemporalContext['pendingEvents'] = [];
    const now = new Date();

    for (const fact of result.facts) {
      try {
        // Try to extract event data from fact content
        const jsonMatch = fact.fact?.match(/Tracking: ({.*})/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1]);
          if (data.event) {
            const estimatedDate = data.estimatedDate ? new Date(data.estimatedDate) : undefined;
            events.push({
              event: data.event,
              mentionedDate: data.mentionedDate,
              estimatedDate,
              status: estimatedDate && estimatedDate < now ? 'passed' : 'upcoming'
            });
          }
        }
      } catch {
        // Skip malformed events
      }
    }

    return events;
  } catch (e) {
    console.warn('Could not retrieve pending events:', e);
    return [];
  }
}

/**
 * Main function: Calculate full temporal context
 */
export async function calculateTemporalContext(
  userId: string,
  alreadySurfacedThisSession: boolean = false
): Promise<TemporalContext> {
  // Get last session timestamp
  const lastSession = await getLastSessionTimestamp(userId);
  const now = new Date();

  // Calculate gap
  let gapMinutes = 0;
  if (lastSession) {
    gapMinutes = Math.floor((now.getTime() - lastSession.getTime()) / 1000 / 60);
  }

  const gap: TemporalContext['gap'] = {
    minutes: gapMinutes,
    hours: Math.floor(gapMinutes / 60),
    days: Math.floor(gapMinutes / 60 / 24),
    humanReadable: lastSession ? humanizeGap(gapMinutes) : 'first conversation',
    significance: lastSession ? getGapSignificance(gapMinutes) : 'just_now'
  };

  // Get time context
  const timeOfDay = getTimeOfDay();
  const dayOfWeek = getDayOfWeek();

  // Get pending events
  const pendingEvents = await getPendingEvents(userId);
  const hasPendingEvents = pendingEvents.some(e => e.status === 'passed');

  // Calculate surfacing
  const { shouldSurface, surfaceType } = calculateSurfacingProbability(
    gapMinutes,
    timeOfDay,
    hasPendingEvents,
    alreadySurfacedThisSession
  );

  const context: TemporalContext = {
    gap,
    timeOfDay,
    dayOfWeek,
    pendingEvents,
    shouldSurface,
    surfaceType
  };

  // Generate felt suggestion if surfacing
  context.feltSuggestion = generateFeltSuggestion(context);

  return context;
}

/**
 * Format temporal context for injection into mindstate
 */
export function formatTemporalForMindstate(temporal: TemporalContext): string {
  const parts: string[] = [];

  // Always include factual time info
  parts.push(`Current time: ${temporal.timeOfDay.period} (${temporal.timeOfDay.hour}:00), ${temporal.dayOfWeek.day}`);

  // Gap info (always factual)
  if (temporal.gap.significance !== 'just_now') {
    parts.push(`Last conversation: ${temporal.gap.humanReadable}`);
  } else {
    parts.push(`Last conversation: just now (continuing thread)`);
  }

  // Felt suggestion (only if surfacing)
  if (temporal.shouldSurface && temporal.feltSuggestion) {
    parts.push(`Temporal sense: ${temporal.feltSuggestion}`);
  }

  // Pending events that have passed
  const passedEvents = temporal.pendingEvents.filter(e => e.status === 'passed');
  if (passedEvents.length > 0) {
    const eventNames = passedEvents.map(e => e.event).join(', ');
    parts.push(`Events to wonder about: ${eventNames} (mentioned before, may have happened)`);
  }

  return parts.join('\n');
}
