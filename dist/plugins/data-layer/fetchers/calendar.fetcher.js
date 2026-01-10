/**
 * Calendar Data Fetcher
 *
 * Priority 4: Custody schedule is HIGH priority (affects everything)
 *
 * Fetches today's events, upcoming events, and custody schedule from Google Calendar.
 * The custody detection is crucial for Zosia to understand Dave's context.
 * Rate limit: Hourly (via cache TTL)
 */
// ============================================================================
// Configuration
// ============================================================================
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
// ============================================================================
// Custody Detection
// ============================================================================
// Keywords that indicate custody-related events
const CUSTODY_KEYWORDS = [
    'custody',
    'kids',
    'children',
    'pickup',
    'drop-off',
    'dropoff',
    'handoff',
    'transition',
    'week on',
    'week off',
    'dad time',
    'mom time',
];
const WORK_KEYWORDS = [
    'meeting',
    'standup',
    'sync',
    'review',
    '1:1',
    'one-on-one',
    'interview',
    'call',
    'presentation',
    'demo',
];
const KIDS_ACTIVITY_KEYWORDS = [
    'school',
    'practice',
    'lesson',
    'recital',
    'game',
    'soccer',
    'piano',
    'swimming',
    'birthday party',
    'playdate',
];
function categorizeEvent(event) {
    const text = `${event.summary} ${event.description || ''}`.toLowerCase();
    if (CUSTODY_KEYWORDS.some((kw) => text.includes(kw))) {
        return 'custody';
    }
    if (KIDS_ACTIVITY_KEYWORDS.some((kw) => text.includes(kw))) {
        return 'kids';
    }
    if (WORK_KEYWORDS.some((kw) => text.includes(kw))) {
        return 'work';
    }
    return 'personal';
}
// ============================================================================
// Fetcher Implementation
// ============================================================================
/**
 * Create a Google Calendar data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeCalendarFetcher({
 *   accessToken: await brainCreds.get('google_calendar_token'),
 *   custodyCalendarId: 'custody_calendar_id',
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * if (data.custody.isWeekOn) {
 *   console.log('Kids are with Dave this week');
 * }
 * ```
 */
export function makeCalendarFetcher(config) {
    const { accessToken, calendarId = 'primary', custodyCalendarId, debug = false, } = config;
    return async () => {
        if (debug) {
            console.log('[CalendarFetcher] Fetching data from Google Calendar API...');
        }
        try {
            // Calculate time range
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() + 7);
            // Fetch primary calendar events
            const eventsResponse = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?` +
                new URLSearchParams({
                    timeMin: todayStart.toISOString(),
                    timeMax: weekEnd.toISOString(),
                    singleEvents: 'true',
                    orderBy: 'startTime',
                    maxResults: '50',
                }), {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!eventsResponse.ok) {
                throw new Error(`Google Calendar API error: ${eventsResponse.status}`);
            }
            const eventsData = (await eventsResponse.json());
            // Optionally fetch custody calendar if specified
            let custodyEvents = [];
            if (custodyCalendarId) {
                const custodyResponse = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(custodyCalendarId)}/events?` +
                    new URLSearchParams({
                        timeMin: todayStart.toISOString(),
                        timeMax: weekEnd.toISOString(),
                        singleEvents: 'true',
                        orderBy: 'startTime',
                        maxResults: '20',
                    }), {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (custodyResponse.ok) {
                    const custodyData = (await custodyResponse.json());
                    custodyEvents = custodyData.items || [];
                }
            }
            // Transform and categorize events
            const allEvents = [...eventsData.items, ...custodyEvents];
            const transformedEvents = allEvents.map(transformEvent);
            // Split into today and upcoming
            const todayEvents = transformedEvents.filter((e) => e.start >= todayStart && e.start <= todayEnd);
            const upcomingEvents = transformedEvents.filter((e) => e.start > todayEnd);
            // Detect custody status
            const custody = detectCustodyStatus(allEvents, now);
            // Analyze patterns
            const patterns = analyzeCalendarPatterns(todayEvents);
            if (debug) {
                console.log(`[CalendarFetcher] Today: ${todayEvents.length} events, ` +
                    `Custody: ${custody.isWeekOn ? 'ON' : 'OFF'}`);
            }
            return {
                today: todayEvents,
                upcoming: upcomingEvents,
                custody,
                patterns,
                fetchedAt: new Date(),
            };
        }
        catch (error) {
            if (debug) {
                console.error('[CalendarFetcher] Error:', error);
            }
            throw error;
        }
    };
}
// ============================================================================
// Data Transformers
// ============================================================================
function transformEvent(event) {
    const startDate = event.start.dateTime
        ? new Date(event.start.dateTime)
        : event.start.date
            ? new Date(event.start.date)
            : new Date();
    const endDate = event.end.dateTime
        ? new Date(event.end.dateTime)
        : event.end.date
            ? new Date(event.end.date)
            : new Date();
    return {
        title: event.summary || 'Untitled',
        start: startDate,
        end: endDate,
        type: categorizeEvent(event),
        location: event.location,
    };
}
function detectCustodyStatus(events, now) {
    // Look for explicit custody events
    const custodyEvents = events.filter((e) => {
        const text = `${e.summary} ${e.description || ''}`.toLowerCase();
        return CUSTODY_KEYWORDS.some((kw) => text.includes(kw));
    });
    // Try to determine if this is a "week on" or "week off"
    // Look for phrases like "week on", "kids with me", etc.
    let isWeekOn = false;
    let transitionDate = null;
    for (const event of custodyEvents) {
        const text = `${event.summary} ${event.description || ''}`.toLowerCase();
        if (text.includes('week on') || text.includes('kids with')) {
            isWeekOn = true;
        }
        if (text.includes('week off') || text.includes('kids leave')) {
            isWeekOn = false;
        }
        // Look for transition events
        if (text.includes('pickup') ||
            text.includes('drop-off') ||
            text.includes('handoff') ||
            text.includes('transition')) {
            const eventStart = event.start.dateTime
                ? new Date(event.start.dateTime)
                : event.start.date
                    ? new Date(event.start.date)
                    : null;
            if (eventStart && eventStart > now) {
                if (!transitionDate || eventStart < transitionDate) {
                    transitionDate = eventStart;
                }
            }
        }
    }
    // Calculate days until transition
    const daysUntilTransition = transitionDate
        ? Math.ceil((transitionDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : 7; // Default to 7 if unknown
    // If no explicit custody events, try to infer from kids activities
    if (custodyEvents.length === 0) {
        const kidsEvents = events.filter((e) => categorizeEvent(e) === 'kids' || categorizeEvent(e) === 'custody');
        isWeekOn = kidsEvents.length > 2; // If many kids events, probably week on
    }
    return {
        isWeekOn,
        transitionDate,
        daysUntilTransition,
        nextWeekType: isWeekOn ? 'off' : 'on',
    };
}
function analyzeCalendarPatterns(todayEvents) {
    // Count meeting hours
    let meetingHours = 0;
    for (const event of todayEvents) {
        if (event.type === 'work') {
            const durationMs = event.end.getTime() - event.start.getTime();
            meetingHours += durationMs / (1000 * 60 * 60);
        }
    }
    // Determine busy level
    let busyLevel = 'moderate';
    if (todayEvents.length <= 2 && meetingHours < 2) {
        busyLevel = 'light';
    }
    else if (todayEvents.length >= 6 || meetingHours >= 4) {
        busyLevel = 'heavy';
    }
    return {
        busyLevel,
        meetingLoad: Math.round(meetingHours * 10) / 10, // Round to 1 decimal
    };
}
// ============================================================================
// Mock Implementation for Development
// ============================================================================
/**
 * Create a mock Calendar fetcher for development/testing
 */
export function makeMockCalendarFetcher(options) {
    return async () => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        const now = new Date();
        const isWeekOn = options?.isWeekOn ?? true;
        return {
            today: [
                {
                    title: 'Team standup',
                    start: new Date(now.setHours(9, 0, 0, 0)),
                    end: new Date(now.setHours(9, 30, 0, 0)),
                    type: 'work',
                },
                {
                    title: '1:1 with manager',
                    start: new Date(now.setHours(14, 0, 0, 0)),
                    end: new Date(now.setHours(14, 30, 0, 0)),
                    type: 'work',
                },
            ],
            upcoming: [
                {
                    title: isWeekOn ? 'Kids soccer practice' : 'Dinner with friends',
                    start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                    end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
                    type: isWeekOn ? 'kids' : 'personal',
                },
            ],
            custody: {
                isWeekOn,
                transitionDate: new Date(Date.now() + (options?.daysUntilTransition ?? 3) * 24 * 60 * 60 * 1000),
                daysUntilTransition: options?.daysUntilTransition ?? 3,
                nextWeekType: isWeekOn ? 'off' : 'on',
            },
            patterns: {
                busyLevel: options?.busyLevel ?? 'moderate',
                meetingLoad: 2,
            },
            fetchedAt: new Date(),
        };
    };
}
