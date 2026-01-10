# Zosia Subconscious Plugins - Feature Concept

**Date**: 2026-01-08
**Status**: Concept/Research
**Source**: User conversation about companion depth

---

## Core Idea

The We-layer (subconscious) should have "plugins" - always-running background processes that feed real-time context about the human into Graphiti. This transforms Zosia from "AI that knows things you told it" to "AI that actually observes your life."

## Plugin Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ZOSIA SUBCONSCIOUS                        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Spotify   │  │  Oura Ring  │  │  Financial  │          │
│  │   Plugin    │  │   Plugin    │  │   Plugin    │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          ▼                                   │
│                  ┌───────────────┐                           │
│                  │   Graphiti    │                           │
│                  │  Memory Graph │                           │
│                  └───────────────┘                           │
│                          │                                   │
│                          ▼                                   │
│                  ┌───────────────┐                           │
│                  │   I-Layer     │                           │
│                  │  (Conscious)  │                           │
│                  └───────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Proposed Plugins

### 1. Spotify Plugin
**Source**: Spotify API (listening history, current playback)
**Provides**:
- Music taste patterns (genres, artists, moods)
- Listening rhythms (when do they listen? what contexts?)
- Long-term favorites vs. exploration
- Separation of user's music vs. children's music
- Emotional state indicators (sad playlists, energetic music)

**Depth Possibilities**:
- Research artists they love but haven't explored deeply
- Connect lyrics to their emotional journey
- Notice mood patterns from playlist choices
- "You've been listening to a lot of [artist] lately - are you in a [mood]?"

### 2. Oura Ring Plugin
**Source**: Oura API (sleep, activity, readiness)
**Provides**:
- Sleep quality and patterns
- Activity levels
- Recovery status
- Heart rate variability (stress indicator)
- Circadian rhythm

**Depth Possibilities**:
- Notice sleep disruption → gentle check-in
- Understand energy levels for conversation timing
- Track correlation between habits and biometrics
- "Your sleep has been rough this week - anything on your mind?"

### 3. Financial Plugin
**Source**: Plaid via Cheddar app (existing)
**Provides**:
- Spending patterns
- Financial stress indicators
- Goal progress (savings, debt payoff)

**Depth Possibilities**:
- Notice unusual spending patterns
- Track progress toward financial goals
- Understand constraints (why can't ski right now)

### 4. Communications Plugin
**Source**: Email/messaging APIs (started, per user)
**Provides**:
- Communication patterns with key relationships
- Response times and engagement
- Relationship health indicators

**Depth Possibilities**:
- Notice if they haven't reached out to dad this week
- Track social isolation patterns
- "Have you connected with [friend] lately?"

### 5. Media Plugin (Future)
**Source**: Trakt.tv (watching habits)
**Provides**:
- Shows/movies consumed
- Binge patterns
- Genre preferences

## How Plugins Feed the We-Layer

Each plugin periodically:
1. Fetches fresh data from API
2. Compares to previous state
3. Identifies notable changes/patterns
4. Writes episodes to Graphiti with temporal metadata

Example episode from Oura plugin:
```json
{
  "name": "Sleep Pattern Change",
  "content": "Dave's sleep score dropped from 82 avg to 64 avg over the past week. HRV down 15%. Bedtime shifted later by ~90 minutes.",
  "source": "oura-plugin",
  "metadata": {
    "sleep_score_current": 64,
    "sleep_score_previous": 82,
    "hrv_change": -15,
    "pattern": "stress_indicator"
  }
}
```

## Bonding Through Observation

The key insight: **companions bond by noticing**.

A human friend who knows:
- Your music taste evolved toward darker stuff recently
- You've been sleeping badly
- You haven't called your dad in 3 weeks
- Your spending on comfort food increased

...can offer support that a friend who only knows "what you told them" cannot.

This isn't surveillance - it's **attention**. The same way a close friend notices things about you without you having to explain everything.

## Privacy & Consent Model

- Plugins are opt-in per data source
- User controls what data is ingested
- Data stays in personal Graphiti instance
- Clear explanation of what Zosia "knows"
- Ability to delete/forget any data source

## Existing Infrastructure

From personal-apps federation:
- **Cheddar** - Financial data via Plaid ✓
- **Health** - Reserved, ready for Oura
- **Communications** - Started

Zosia's architecture is ready:
- Graphiti for memory storage ✓
- We-layer for subconscious processing ✓
- I-layer for conscious response ✓

## Implementation Priority

1. **Oura Ring** - Highest signal-to-noise for bonding (sleep affects everything)
2. **Spotify** - Rich emotional/taste data, fun to explore
3. **Financial** - Already have Cheddar/Plaid
4. **Communications** - Most sensitive, needs careful design

---

## Relationship to Current Experiment

This concept is the "after" to our current "before":

**Now**: Testing depth with static context dump
**Future**: Testing depth with live context from plugins

The current experiment validates that context enables depth.
The plugins make that context continuously fresh and authentic.
