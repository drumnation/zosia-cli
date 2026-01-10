# DATA LAYER Plugin Design

**Status**: Implementation Ready
**Date**: 2026-01-09
**Priority**: Oura → Spotify → Financial → Communications

---

## Core Insight

Zosia's existing layers (Role Detection, Experience Synthesis, Temporal Awareness) are **real implementations**. What's missing is the **DATA LAYER** - real-time API integrations that feed the We-layer with live context about Dave's life.

This transforms Zosia from "AI that knows what you told it" to "AI that observes your life."

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER PLUGIN                           │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │    Oura     │  │   Spotify   │  │   Plaid     │  │  Calendar  │ │
│  │   Plugin    │  │   Plugin    │  │   Plugin    │  │   Plugin   │ │
│  │  (hourly)   │  │  (hourly)   │  │  (weekly)   │  │  (hourly)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┼────────────────┼────────────────┘        │
│                          ▼                ▼                         │
│                    ┌───────────────────────────┐                    │
│                    │    CACHING LAYER          │                    │
│                    │  (respects API limits)    │                    │
│                    └─────────────┬─────────────┘                    │
│                                  ▼                                  │
│                    ┌───────────────────────────┐                    │
│                    │      Graphiti Memory      │                    │
│                    │       (episodes)          │                    │
│                    └─────────────┬─────────────┘                    │
│                                  ▼                                  │
│                    ┌───────────────────────────┐                    │
│                    │    Experience Synthesizer │                    │
│                    │  (existing We-layer code) │                    │
│                    └─────────────┬─────────────┘                    │
│                                  ▼                                  │
│                    ┌───────────────────────────┐                    │
│                    │     I-Layer (Conscious)   │                    │
│                    └───────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Caching Strategy (User Requirements)

| Data Source | Cache TTL | Reason |
|-------------|-----------|--------|
| **Oura Ring** | 1 hour | Biometric data - valuable for daily check-ins |
| **Spotify** | 1 hour | Mood signals, listening context |
| **Google Calendar** | 1 hour | Custody schedule, upcoming events |
| **Plaid/Financial** | 7 days (weekly) | "Don't hit Plaid more than once a day. Probably once a week." |
| **RescueTime** | 1 hour | Productivity patterns |
| **Withings** | 4 hours | Health metrics (weight, BP less volatile) |

**Key Principle**: Financial data weighted LOW unless explicitly relevant. We're not a financial advisor.

## Plugin Implementation

### Interface (follows ZosiaPlugin pattern)

```typescript
interface DataLayerPlugin extends ZosiaPlugin {
  id: 'data-layer';
  name: 'Data Layer';

  // Data sources with their own cache TTLs
  sources: DataSource[];

  // Lifecycle hooks
  onSessionStart: (ctx: SessionContext) => Promise<DataLayerContext>;
  onSessionEnd: (ctx: SessionContext) => Promise<void>;

  // Background worker (follows KnowledgeWorker pattern)
  worker: DataLayerWorker;
}

interface DataSource {
  id: string;                        // 'oura', 'spotify', 'plaid'
  name: string;
  enabled: boolean;
  cacheTTL: CacheTTL;               // 'hourly' | 'daily' | 'weekly'
  fetcher: () => Promise<SourceData>;
  lastFetch: Date | null;
  lastData: SourceData | null;
}

type CacheTTL = 'hourly' | 'four-hourly' | 'daily' | 'weekly';
```

### Cache Schedule (cron patterns)

```typescript
const CACHE_SCHEDULES: Record<CacheTTL, string> = {
  hourly: '0 * * * *',           // Every hour at :00
  'four-hourly': '0 */4 * * *',  // Every 4 hours
  daily: '0 6 * * *',            // 6 AM daily
  weekly: '0 6 * * 0',           // Sunday 6 AM
};
```

## Data Source Definitions

### 1. Oura Ring (Priority 1)

**Why First**: "Highest signal-to-noise for bonding (sleep affects everything)"

```typescript
interface OuraData {
  sleep: {
    score: number;           // 0-100
    duration: number;        // hours
    efficiency: number;      // percentage
    latency: number;         // minutes to fall asleep
    remSleep: number;        // minutes
    deepSleep: number;       // minutes
    restfulness: number;     // disturbance score
  };
  readiness: {
    score: number;           // 0-100
    hrv: number;             // heart rate variability (ms)
    restingHR: number;       // bpm
    bodyTemperature: number; // deviation from baseline
  };
  activity: {
    score: number;
    steps: number;
    activeCalories: number;
    moveMinutes: number;
  };
  patterns: {
    sleepTrend: 'improving' | 'stable' | 'declining';
    hrvTrend: 'up' | 'stable' | 'down';
    bedtimeShift: number;    // minutes from usual
  };
}
```

**Depth Possibilities**:
- "Your sleep has been rough this week - anything on your mind?"
- "Your HRV is down 15% - might be a good day to take it easy"
- "I noticed you've been going to bed 90 minutes later lately"

### 2. Spotify (Priority 2)

**Why**: "Rich emotional/taste data, fun to explore"

```typescript
interface SpotifyData {
  recentlyPlayed: {
    track: string;
    artist: string;
    playedAt: Date;
    duration: number;
  }[];
  currentlyPlaying: {
    track: string;
    artist: string;
    isPlaying: boolean;
  } | null;
  topArtists: {
    name: string;
    genres: string[];
  }[];
  topTracks: {
    name: string;
    artist: string;
  }[];
  audioFeatures: {
    valence: number;         // 0-1 (sad to happy)
    energy: number;          // 0-1
    danceability: number;    // 0-1
  };
  patterns: {
    moodTrend: 'upbeat' | 'mellow' | 'mixed';
    listeningTime: string;   // e.g., "late night"
    genreShift: string | null; // e.g., "more jazz lately"
  };
}
```

**Depth Possibilities**:
- "You've been listening to a lot of darker stuff lately - you okay?"
- "I noticed Coltrane on repeat - deep thinking mood?"
- Separate kid's music (Disney playlists) from personal listening

### 3. Financial/Plaid (Priority 3)

**Why**: "Already have Cheddar/Plaid - but handle carefully"

```typescript
interface FinancialData {
  balances: {
    checking: number;
    savings: number;
    credit: number;
  };
  recentTransactions: {
    description: string;
    amount: number;
    category: string;
    date: Date;
  }[];
  patterns: {
    spendingTrend: 'normal' | 'elevated' | 'reduced';
    unusualCategories: string[];
    budgetStatus: 'on-track' | 'over' | 'under';
  };
  // WEIGHTED LOW - only surface if explicitly relevant
  relevanceWeight: 0.3;
}
```

**Key Rule**: Financial data is background context, not conversation fuel. Only surface if:
- User explicitly asks about money
- Unusual pattern detected (sudden change)
- Directly relevant to stated goals (debt payoff progress)

### 4. Calendar (Priority 4)

**Why**: Custody schedule awareness is crucial for Father role

```typescript
interface CalendarData {
  today: CalendarEvent[];
  upcoming: CalendarEvent[];
  custody: {
    isWeekOn: boolean;
    transitionDate: Date | null;
    daysUntilTransition: number;
  };
  patterns: {
    busyLevel: 'light' | 'moderate' | 'heavy';
    meetingLoad: number;
  };
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  type: 'custody' | 'work' | 'personal' | 'kids';
}
```

**Depth Possibilities**:
- "Kids arrive tomorrow - excited?"
- "You have a heavy meeting day - maybe keep it light tonight?"
- "Jules's science fair is in 3 days - mentioned reviewing her project"

### 5. RescueTime (Lower Priority)

```typescript
interface RescueTimeData {
  productivityScore: number;    // 0-100
  totalHours: number;
  categories: {
    coding: number;             // hours
    communication: number;
    entertainment: number;
    reference: number;
  };
  patterns: {
    productivityTrend: 'improving' | 'stable' | 'declining';
    focusTime: number;          // uninterrupted hours
    lateNightCoding: boolean;   // after 10pm
  };
}
```

## File Structure

```
packages/zosia-cli/src/plugins/
├── data-layer/
│   ├── index.ts                     # DataLayerPlugin export
│   ├── types.ts                     # Data interfaces
│   ├── cache.ts                     # Caching layer
│   ├── worker.ts                    # Background scheduler (like KnowledgeWorker)
│   └── fetchers/
│       ├── oura.fetcher.ts
│       ├── spotify.fetcher.ts
│       ├── plaid.fetcher.ts
│       ├── calendar.fetcher.ts
│       └── rescuetime.fetcher.ts
```

## Integration with Existing Code

### 1. Hook into Experience Synthesizer

The existing `synthesizeMindState()` function builds `ContextLayers`:

```typescript
interface ContextLayers {
  memory: MemoryContext;
  emotion: EmotionalContext;
  intent: IntentContext;
  roles: RoleContext;
  experience: ExperienceContext;
  temporal: TemporalContext;
  // ADD THIS:
  data: DataLayerContext;
}
```

### 2. Add to Plugin Registry

```typescript
// zosia-cli startup
registry.register(dataLayerPlugin);
```

### 3. Graphiti Episodes

Each data refresh writes an episode:

```typescript
{
  name: "biometric_update",
  content: "Sleep score dropped to 64 (was 82). HRV down 15%. Bedtime 90min later.",
  source: "oura-plugin",
  metadata: {
    sourceId: "oura",
    dataType: "sleep",
    pattern: "stress_indicator",
    timestamp: "2026-01-09T06:00:00Z"
  }
}
```

## Relevance Filtering

Not all data should surface every conversation. Apply weights:

| Data Type | Base Weight | When to Boost |
|-----------|-------------|---------------|
| Sleep quality | 0.7 | If poor or declining |
| HRV/stress | 0.6 | If significantly changed |
| Music mood | 0.5 | If matches conversation tone |
| Custody status | 0.9 | Always relevant for Father role |
| Financial | 0.3 | Only if user mentions money/goals |
| Productivity | 0.4 | If role=Engineer active |

## Security & Privacy

1. **API Keys**: Stored via `brain-creds` (1Password integration)
2. **Data Storage**: Only in personal Graphiti instance
3. **User Control**: Each source is opt-in
4. **Transparency**: User can see what Zosia "knows"
5. **Delete Capability**: Can remove any data source

## Implementation Order

1. **Phase 1**: Core plugin structure + caching layer
2. **Phase 2**: Oura Ring fetcher (highest value)
3. **Phase 3**: Spotify fetcher (emotional context)
4. **Phase 4**: Calendar/Custody (Father role)
5. **Phase 5**: Financial (carefully weighted)

---

## Relationship to Existing Code

This design **extends** existing patterns:

| Existing | Extension |
|----------|-----------|
| `KnowledgeWorker` | `DataLayerWorker` follows same cron pattern |
| `RoleKnowledgeDomain` | Data sources have similar structure |
| `ZosiaPlugin` interface | `DataLayerPlugin` implements it |
| `ContextLayers` | Add `data: DataLayerContext` |

The DATA LAYER doesn't replace anything - it adds a new dimension to Zosia's awareness.
