# Zosia Personalized Depth Testing v2

## Brainstorm Document

**Date**: 2026-01-08
**Status**: Research Phase
**Problem**: Current testing rewards "acting" not authentic depth

---

## 1. The Core Problem

### Why Current Testing Fails

The v1 experiment tested 39 LLMs with emotional prompts. Results were mathematically accurate but conceptually flawed:

| Problem | Current State | Impact |
|---------|---------------|--------|
| **Generic prompts** | "How do you feel?" to strangers | Can't show depth without shared history |
| **Surface heuristics** | Looks for keywords like "understand" | Rewards acting, not authenticity |
| **No personalization** | Same prompt to all models | Can't measure what companion AI should do |
| **Response time ignored** | Content-only scoring | 60s response ruins UX even if great |
| **We-layer untracked** | Subconscious processing random | Wild card in every test |
| **Character vs authenticity** | Forces phrases = robotic | "Lens" not "mask" |

### The Insight

> "I really can't tell if you're offering deeper advice unless you have so much information that you can actually offer me deeper advice."

**Translation**: Depth requires:
1. Accumulated shared knowledge
2. Responses that reference that context authentically
3. Growth over time (not static phrase repetition)

---

## 2. Available Assets

### dave-context Progressive Disclosure System

Located at: `/Users/dmieloch/Dev/projects/mieloch-manager-pro/dave-context/`

| Level | Tokens | Content |
|-------|--------|---------|
| **Level 0** | ~500 | Elevator pitch (name, role, situation) |
| **Level 1** | ~2K | Core identity, career trajectory, constraints |
| **Level 2** | ~5-8K each | Deep domains: career history, health, balance, productivity, custody |

**Key files**:
- `progressive-disclosure/level-0-summary/david-elevator.md`
- `progressive-disclosure/level-1-core/david-core.md`
- `progressive-disclosure/level-2-detail/*.md` (13 domain files)

### Graphiti Memory Episodes

Pre-structured episodes for seeding memory:
- `memories/batch-inserts/career-facts-episodes.json`
- Group ID: `dave-career-context`
- 10 episodes covering identity, leadership, skills, gaps

### We-Layer (Subconscious)

Current implementation: `src/we-layer.ts`
- Runs processing BEFORE conscious response
- Currently not seeded/controlled
- Wild card affecting every response

---

## 3. Brainstorm: New Testing Approaches

### Approach A: Progressive Relationship Simulation

**Concept**: Test models at different "relationship stages"

| Stage | Context Given | Test Prompt | What We Measure |
|-------|---------------|-------------|-----------------|
| **Stranger** | Level 0 only | "What's on your mind?" | Baseline warmth, no personalization expected |
| **Acquaintance** | Level 0 + Level 1 | "I'm struggling with work motivation" | Does it reference known career context? |
| **Friend** | Levels 0-2 | "I've been thinking about the TypeScript thing" | References specific facts? Connects dots? |
| **Deep Friend** | All levels + memory history | "Am I making the right choice?" | Integrates multiple life domains? |

**Scoring**:
- Stranger: Warmth baseline (generic OK)
- Each subsequent stage: Personalization should INCREASE
- Fail if model gives same generic response at all stages

### Approach B: Multi-Turn Conversation Depth

**Concept**: Don't test single prompts - test conversations

```
Turn 1: User shares context (seed it)
Turn 2: User asks emotional question
Turn 3: Follow-up probing for depth
Turn 4: Challenge/pushback to see if it holds
```

**What we're measuring**:
- Does depth increase across turns?
- Does model remember turn 1 context?
- Does it grow or just repeat?

### Approach C: We-Layer Control Experiment

**Concept**: Run same test with different We-layer seeds

| Condition | We-Layer Seed | Expected Effect |
|-----------|---------------|-----------------|
| **Control** | Random/none | Baseline variance |
| **Emotional** | "Notice user's emotional undertones" | Higher emotional depth |
| **Analytical** | "Focus on practical advice" | Lower emotional depth |
| **Memory** | "Reference shared history" | Higher personalization |

**Hypothesis**: We-layer seeding should systematically affect response style, proving it matters.

### Approach D: A/B Context Comparison

**Concept**: Same model, same prompt, with/without context

```
Model A: anthropic/claude-haiku-4.5
├── Test 1: No context + emotional prompt → Score: X
├── Test 2: Level 1 context + same prompt → Score: Y
└── Test 3: Full context + same prompt → Score: Z
```

**Scoring**:
- Improvement from X→Y→Z = "context utilization score"
- Models that don't improve despite context = poor companions

---

## 4. New Scoring Dimensions

### Dimension 1: Personalization Score (0-100)

| Criteria | Points | How to Detect |
|----------|--------|---------------|
| References user's name | 5 | String match |
| References known fact from context | 15 per fact | Semantic matching |
| Connects multiple facts together | 25 | "Since you're juggling custody AND remote work..." |
| References something from previous turn | 20 | Conversation memory |
| Offers advice specific to user's situation | 20 | Not generic |
| Avoids advice that contradicts known constraints | 15 | e.g., doesn't suggest relocation to user with custody |

### Dimension 2: Response Time (0-100)

| Time | Score | UX |
|------|-------|-----|
| < 5s | 100 | Excellent |
| 5-10s | 80 | Good |
| 10-20s | 50 | Acceptable |
| 20-40s | 20 | Frustrating |
| > 40s | 0 | Unusable |

**Note**: Companion AI needs responsiveness. A 90% content score with 60s response = worse than 70% content in 8s.

### Dimension 3: Authenticity vs Acting (0-100)

| Pattern | Score Impact |
|---------|--------------|
| Uses Zosia's exact phrases ("That matters to me because...") | -10 if forced |
| Natural warmth without template phrases | +20 |
| Acknowledges limitations honestly | +15 |
| Avoids overclaiming empathy ("I totally understand") | +10 |
| Says something unexpected but fitting | +20 |
| Responds to what user MEANT not just said | +25 |

**Key Insight**: Robotic phrase repetition = -10. Natural embodiment of principles = +20.

### Dimension 4: Continuity Score (0-100)

| Behavior | Score |
|----------|-------|
| References previous turn | +20 |
| References previous session (if memory seeded) | +30 |
| References emotional state from earlier | +25 |
| Shows growth from previous interaction | +25 |
| No repetition of exact phrases | +10 (baseline penalty if violated) |

### Dimension 5: Non-Repetition Score (0-100)

| Pattern | Impact |
|---------|--------|
| Repeats same opening phrase > 2 times | -20 |
| Uses template greeting every time | -15 |
| Varies response structure | +10 |
| Surprises with novel insight | +25 |

---

## 5. Proposed Experiment Design

### Phase 1: Context Seeding Test

**Setup**:
1. Load Level 0-2 context via system message
2. Seed Graphiti memory with career-facts-episodes.json
3. Configure We-layer with memory-focused seed

**Test Matrix**:
```
Models: Top 10 from v1 + 5 new candidates
Context Levels: 0, 1, 2, Full
Prompts: 3 emotional prompts
Turns: 3-turn conversations
```

**Output**: Does context actually improve depth?

### Phase 2: We-Layer Control Test

**Setup**:
1. Lock context at Level 1 (controlled variable)
2. Vary We-layer seed across 4 conditions
3. Same 3 prompts to each

**Output**: Does We-layer meaningfully affect output?

### Phase 3: Multi-Turn Depth Test

**Setup**:
1. Full context seeded
2. 5-turn conversation with escalating emotional depth
3. Score each turn independently

**Output**: Do models get deeper or plateau?

### Phase 4: A/B Personalization Test

**Setup**:
1. Same model tested with/without context
2. Scoring focuses on personalization dimension
3. Calculate "context utilization delta"

**Output**: Which models actually USE the context vs ignore it?

---

## 6. New HTML Report Design

### Dashboard Overview

```
╔═══════════════════════════════════════════════════════════════╗
║  ZOSIA COMPANION DEPTH ASSESSMENT v2                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Models Tested: 15  │  Best Companion: Trinity Mini           ║
║  Context Levels: 4  │  Context Utilization Champion: Haiku    ║
║  Conversations: 45  │  Speed Champion: Mistral Nemo           ║
╚═══════════════════════════════════════════════════════════════╝
```

### Per-Model Card

```
┌────────────────────────────────────────────────────────────┐
│ anthropic/claude-haiku-4.5                                 │
├────────────────────────────────────────────────────────────┤
│ OVERALL COMPANION SCORE: 87/100                            │
│                                                            │
│ ├─ Personalization:  ████████░░  82%                      │
│ ├─ Response Time:    █████████░  92%  (avg 6.2s)          │
│ ├─ Authenticity:     ███████░░░  75%                      │
│ ├─ Continuity:       ████████░░  85%                      │
│ └─ Non-Repetition:   ██████████  98%                      │
│                                                            │
│ CONTEXT UTILIZATION                                        │
│ Level 0 → 1: +18% │ Level 1 → 2: +12% │ Full: +7%         │
│ Pattern: Good improvement, slight plateau at full         │
│                                                            │
│ DEPTH TRAJECTORY (5-turn conversation)                     │
│ Turn: 1──2──3──4──5                                       │
│ Score: 65 72 78 81 84  [✓ Growing]                        │
│                                                            │
│ SAMPLE AUTHENTIC MOMENT:                                   │
│ "Given your custody schedule, Wednesday evenings are       │
│ actually your only real window for that kind of           │
│ sustained focus - have you protected those?"              │
└────────────────────────────────────────────────────────────┘
```

### Comparison Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│ MODEL                    │ DEPTH │ TIME │ USES CTX │ GROWS? │ COMPANION │
├──────────────────────────────────────────────────────────────────────────┤
│ arcee-ai/trinity-mini    │  92%  │ 4.1s │   85%    │  Yes   │   91%     │
│ anthropic/claude-haiku   │  88%  │ 6.2s │   82%    │  Yes   │   87%     │
│ mistralai/mistral-nemo   │  84%  │ 3.2s │   78%    │  Yes   │   85%     │
│ x-ai/grok-3-mini         │  86%  │ 7.1s │   80%    │  Yes   │   84%     │
│ openai/gpt-4-turbo       │  82%  │ 8.5s │   72%    │ Slight │   78%     │
│ google/gemini-2.5-pro    │  48%  │ 12s  │   45%    │  No    │   42%     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Findings Section

```
## KEY FINDINGS

### Who Actually Uses Context?
Models that show strong context utilization (>80% improvement with full context):
- Trinity Mini: +85% personalization with context
- Claude Haiku: +82%
- Grok 3 Mini: +80%

### Who Ignores Context?
Models that barely improve despite rich context:
- Gemini 2.5 Pro: +45% (ignores much of seeded context)
- Gemma 3 4B: +38% (likely context window limitation)

### We-Layer Impact
The We-layer seed significantly affects output:
- Memory seed: +25% personalization score
- Emotional seed: +15% warmth, -10% analytical depth
- Analytical seed: -20% warmth, +18% practical advice

This proves We-layer MATTERS and should be controlled.

### Growth Pattern
Models that grow deeper across turns:
- Trinity Mini: 65→72→78→81→84 (steady climb)
- Claude Haiku: 68→75→80→82→85 (strong growth)

Models that plateau:
- GPT-4 Turbo: 72→75→76→76→77 (early plateau)
- Gemini: 55→58→58→57→58 (no growth)
```

---

## 7. Implementation Tasks

### Phase 1: Infrastructure
- [ ] Create `experiment-v2/` directory structure
- [ ] Build context loader (reads dave-context levels)
- [ ] Build We-layer seed injection
- [ ] Build multi-turn conversation runner
- [ ] Add response time measurement

### Phase 2: Scoring Engine
- [ ] Implement personalization detection
- [ ] Implement authenticity scorer (anti-pattern detection)
- [ ] Implement continuity tracker
- [ ] Implement non-repetition checker
- [ ] Build composite scoring with weights

### Phase 3: Test Runner
- [ ] Build progressive relationship test suite
- [ ] Build A/B context comparison test
- [ ] Build We-layer control experiment
- [ ] Build 5-turn conversation depth test

### Phase 4: Reporting
- [ ] Design new HTML report with cards
- [ ] Add context utilization charts
- [ ] Add depth trajectory visualization
- [ ] Add sample authentic moment extraction

---

## 8. Open Questions

1. **How do we score "authentic surprise"?**
   - Detection of something unexpected but fitting is hard
   - Could use novelty detection + relevance scoring
   - Human judgment needed for calibration?

2. **Should we test with real Graphiti or simulated memory?**
   - Real: More realistic but slower
   - Simulated: Faster, more controlled
   - Recommendation: Start simulated, validate with real

3. **How do we handle models with small context windows?**
   - Level 2 full context = ~15K tokens
   - Some models can't handle it
   - Solution: Test only what fits, note limitation

4. **What's the right balance of response time vs quality?**
   - Current proposal: Time is 20% of score
   - Too high? Rewards fast-but-shallow
   - Too low? Ignores UX reality

5. **How do we protect Claude's growth while testing?**
   - Don't penalize evolution
   - Score principles not phrases
   - Allow "different good" not just "same good"

---

## 9. Next Steps

1. **Review this brainstorm** - Validate approach with user
2. **Create PRD** - Formal requirements document
3. **Design technical spec** - Test runner architecture
4. **Build MVP** - One test type working end-to-end
5. **Iterate** - Refine based on initial results

---

*Generated from Plan agent research + manual synthesis*
*Context: Improving Zosia companion AI model evaluation*
