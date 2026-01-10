# Zosia Experiments v2 - Session Handoff

**Date**: 2026-01-08
**Session**: Blake-33
**Context at handoff**: 143K/200K (71%)

---

## What Was Accomplished

### 1. Context Loader ✅
`experiments-v2/context-loader.ts` - Loads dave-context at different relationship stages:
- stranger (0 tokens), acquaintance (~1.4K), friend (~6K), deepFriend (~24K)
- 12 Level-2 domains from `/Users/dmieloch/Dev/projects/mieloch-manager-pro/dave-context/`

### 2. Test Runner ✅
`experiments-v2/test-runner.ts` - Runs LLM tests via OpenRouter:
- Response time measurement per turn
- Multi-turn conversation support
- A/B context comparison mode
- Tested working with Mistral (2.7s avg response)

### 3. We-Layer Seeder ✅
`experiments-v2/we-layer-seeder.ts` - Seeds Graphiti knowledge graph:
- 23 episodes ready (10 JSON + 13 markdown)
- 10 episodes seeded to Graphiti `zosia-dmieloch` group
- Retrieval tested and working:
  - "custody children remote work" → 3 facts
  - "leadership team management" → 5 nodes

### 4. Personal Context Added ✅
Created `/Users/dmieloch/Dev/projects/mieloch-manager-pro/dave-context/progressive-disclosure/level-2-detail/personal-life-interests.md`
- Hobbies: drums, ice hockey, skiing, fitness, video games
- Relationships: dad, friends (Zubair, Ben, JP)
- Emotional state: recovering from survival mode

### 5. Subconscious Plugins Concept ✅
Documented at `docs/features/subconscious-plugins/00-research/concept.md`
- Spotify, Oura Ring, Financial, Communications plugins
- Architecture for always-running context feeders

---

## IMMEDIATE TODO: Spotify Setup

### Credentials ✅ DONE
```bash
brain-creds get spotify_dave_client_id      # ✅ exists
brain-creds get spotify_dave_client_secret  # ✅ exists
```

**Spotify App "Zosia":**
- Client ID: `e70b96c38c5647e28db84c121549c05d`
- App Status: Development mode
- Redirect URI: `https://example.com/callback` (needs update to localhost)

### OAuth Flow Required
Spotify uses OAuth 2.0. To get user's listening history:

1. **Update redirect URI** in Spotify Dashboard to something local:
   - `http://localhost:8888/callback` (for local dev)

2. **Scopes needed** for listening history:
   - `user-read-recently-played`
   - `user-top-read`
   - `user-read-playback-state`
   - `user-library-read`

3. **Authorization URL**:
```
https://accounts.spotify.com/authorize?
  client_id=e70b96c38c5647e28db84c121549c05d&
  response_type=code&
  redirect_uri=http://localhost:8888/callback&
  scope=user-read-recently-played%20user-top-read%20user-library-read
```

4. **Exchange code for token** at `https://accounts.spotify.com/api/token`

5. **Store refresh token** in brain-creds for long-term access

---

## Next Steps for Experiments v2

### Priority 1: Seed Remaining Episodes
```bash
# Run the seeder to prepare remaining episodes
npx tsx experiments-v2/we-layer-seeder.ts

# Then manually seed via MCP or build automated seeder
```

Personal context episodes not yet seeded:
- Personal Hobbies and Interests
- Relationships and Social Goals
- Fitness and Health Journey
- Education and Music Background

### Priority 2: Retrieval-Augmented Test Runner
Modify test runner to:
1. Before each prompt, query Graphiti for relevant context
2. Build system prompt from retrieved facts (not full context dump)
3. Compare results: full dump vs retrieval-augmented

### Priority 3: Spotify Plugin Prototype
```
experiments-v2/
└── plugins/
    └── spotify/
        ├── auth.ts          # OAuth flow
        ├── fetcher.ts       # API calls
        └── seeder.ts        # Convert to Graphiti episodes
```

**Listening history → Graphiti episodes:**
```json
{
  "name": "Recent Music Taste",
  "content": "Dave has been listening to [artists] heavily this week. Top genres: [genres]. Notable pattern: [observation]",
  "metadata": { "source": "spotify", "period": "7d" }
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `experiments-v2/context-loader.ts` | Load dave-context at relationship stages |
| `experiments-v2/test-runner.ts` | Run LLM tests with timing |
| `experiments-v2/we-layer-seeder.ts` | Seed Graphiti with human context |
| `experiments-v2/index.ts` | Exports |
| `docs/features/subconscious-plugins/00-research/concept.md` | Plugin architecture |
| `docs/features/personalized-depth-testing/00-research/brainstorm.md` | Full experiment design |

## dave-context Location
`/Users/dmieloch/Dev/projects/mieloch-manager-pro/dave-context/progressive-disclosure/`

## Graphiti Group ID
`zosia-dmieloch` - Use this for all Dave-related context

---

## Commands to Verify State

```bash
# Test context loader
npx tsx experiments-v2/context-loader.ts

# Test runner (needs OPENROUTER_API_KEY)
OPENROUTER_API_KEY=$(brain-creds get openrouter_key) npx tsx experiments-v2/test-runner.ts

# Check what's in Graphiti
# Use MCP: mcp__graphiti__get_episodes with group_ids=["zosia-dmieloch"]
```

---

## The Big Picture

**Goal**: Test if personalized context enables genuine depth in LLM responses.

**Hypothesis**: Depth requires accumulated shared knowledge. A model with rich context about the human should produce responses that feel genuinely personalized, not generic.

**Current state**: Infrastructure built. Context loading works. Graphiti seeding works. Ready to run actual depth experiments.

**User insight**: "I can't tell if you're offering deeper advice unless you have so much information that you can actually offer me deeper advice."

---

*Handoff from Blake-33 @ 143K/200K context*
