/**
 * Zosia Orchestrator - Context-First Architecture
 *
 * The We-Layer (Claude) runs FIRST to build rich context,
 * then the I-Layer (smaller model) uses that context to appear more sophisticated.
 *
 * Philosophy: Claude does the thinking, the conscious layer does the talking.
 */
import { callConscious, streamConscious } from './i-layer.js';
import { retrieveDeeper, persistConversation } from './we-layer.js';
import { IDENTITY_KERNEL, ROLE_EXPERIENCE_BRIDGES } from './prompts.js';
import { incrementSessionCount } from './config.js';
import { calculateTemporalContext, recordSessionTimestamp, formatTemporalForMindstate } from './temporal.js';
import { synthesizeMindState, generateExperienceBridgePrompt, } from './experience-synthesizer.js';
import { makeDataLayerPlugin, } from './plugins/data-layer/index.js';
import { execSync } from 'child_process';
// ============================================================================
// DATA LAYER SINGLETON - Real-time life context
// ============================================================================
let dataLayerPlugin = null;
let dataLayerInitialized = false;
/**
 * Initialize the Data Layer Plugin with real credentials
 * This connects Zosia to Oura, Spotify, Calendar, Gmail, Withings, Plaid, RescueTime
 */
async function initializeDataLayer(debug = false) {
    if (dataLayerInitialized)
        return;
    if (debug) {
        console.log('\n┌─ DATA LAYER: INITIALIZING ───────────────────────────┐');
    }
    // Load credentials from brain-creds
    const getCredential = (name) => {
        try {
            return execSync(`brain-creds get ${name}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        }
        catch {
            return undefined;
        }
    };
    const ouraToken = getCredential('oura_token');
    const rescueTimeApiKey = getCredential('rescuetime_api_key');
    if (debug) {
        console.log(`│   Oura: ${ouraToken ? '✅ Real' : '🔶 Mock'}`);
        console.log(`│   RescueTime: ${rescueTimeApiKey ? '✅ Real' : '🔶 Mock'}`);
        console.log(`│   Spotify, Calendar, Gmail, Withings, Plaid: 🔶 Mock (OAuth)`);
    }
    dataLayerPlugin = makeDataLayerPlugin({
        useMocks: false, // Try real data - falls back per-service
        credentials: {
            oura: ouraToken ? { accessToken: ouraToken } : undefined,
            rescueTime: rescueTimeApiKey ? { apiKey: rescueTimeApiKey } : undefined,
        },
        config: {
            debug,
            runOnStartup: true, // Fetch real data immediately so Zosia knows sleep/health
            sources: {
                oura: { enabled: true, cacheTTL: 'hourly' },
                rescueTime: { enabled: true, cacheTTL: 'hourly' },
                spotify: { enabled: true, cacheTTL: 'hourly' },
                calendar: { enabled: true, cacheTTL: 'hourly' },
                gmail: { enabled: true, cacheTTL: 'hourly' },
                withings: { enabled: true, cacheTTL: 'daily' },
                financial: { enabled: true, cacheTTL: 'weekly' },
            },
        },
    });
    // Must call init() before start()
    await dataLayerPlugin.init();
    await dataLayerPlugin.start();
    dataLayerInitialized = true;
    if (debug) {
        console.log('│   ✅ Data Layer initialized');
        console.log('└────────────────────────────────────────────────────────┘');
    }
}
/**
 * Get current Data Layer context
 */
async function getDataLayerContext() {
    if (!dataLayerPlugin)
        return null;
    try {
        return await dataLayerPlugin.getContext();
    }
    catch {
        return null;
    }
}
/**
 * Format Data Layer context for inclusion in mindstate
 * This becomes part of the felt experience - not raw data, but lived context
 */
function formatDataLayerForMindstate(ctx) {
    const parts = [];
    // Health/Energy context (Oura)
    if (ctx.oura) {
        const sleepScore = ctx.oura.sleep?.score;
        const readinessScore = ctx.oura.readiness?.score;
        const hrv = ctx.oura.readiness?.hrv;
        if (sleepScore !== undefined || readinessScore !== undefined) {
            const sleepQuality = sleepScore !== undefined
                ? sleepScore >= 80 ? 'well-rested' : sleepScore >= 60 ? 'somewhat tired' : 'exhausted'
                : null;
            const readiness = readinessScore !== undefined
                ? readinessScore >= 80 ? 'energized' : readinessScore >= 60 ? 'moderate energy' : 'low energy'
                : null;
            if (sleepQuality && readiness) {
                parts.push(`Body context: ${sleepQuality} (sleep ${sleepScore}/100), ${readiness} (readiness ${readinessScore}/100).`);
            }
            else if (sleepQuality) {
                parts.push(`Body context: ${sleepQuality} (sleep ${sleepScore}/100).`);
            }
            else if (readiness) {
                parts.push(`Body context: ${readiness} (readiness ${readinessScore}/100).`);
            }
            if (hrv !== undefined) {
                const hrvContext = hrv >= 50 ? 'good stress recovery' : hrv >= 30 ? 'moderate stress' : 'elevated stress';
                parts.push(`HRV indicates ${hrvContext} (${hrv}ms).`);
            }
        }
    }
    // Music/Mood context (Spotify)
    if (ctx.spotify?.recentlyPlayed && ctx.spotify.recentlyPlayed.length > 0) {
        const recent = ctx.spotify.recentlyPlayed.slice(0, 3);
        const trackNames = recent.map((t) => t.track).join(', ');
        parts.push(`Recently listening to: ${trackNames}.`);
    }
    // Schedule context (Calendar)
    if (ctx.calendar?.today && ctx.calendar.today.length > 0) {
        const upcomingCount = ctx.calendar.today.length;
        const nextEvent = ctx.calendar.today[0];
        parts.push(`Schedule: ${upcomingCount} event(s) today. Next: "${nextEvent.title}".`);
    }
    // Communication context (Gmail)
    if (ctx.gmail?.unreadCount !== undefined && ctx.gmail.unreadCount > 0) {
        const urgency = ctx.gmail.unreadCount > 20 ? 'inbox is busy' : 'some unread messages';
        parts.push(`Email: ${urgency} (${ctx.gmail.unreadCount} unread).`);
    }
    // Productivity context (RescueTime)
    if (ctx.rescueTime?.productivityScore !== undefined) {
        const score = ctx.rescueTime.productivityScore;
        const prodContext = score >= 80 ? 'highly focused day' : score >= 60 ? 'moderately productive' : 'distracted day';
        parts.push(`Work context: ${prodContext} (productivity ${score}%).`);
    }
    // Body composition context (Withings)
    if (ctx.withings?.latestMeasurement?.weight !== undefined) {
        parts.push(`Body: ${ctx.withings.latestMeasurement.weight}kg recorded.`);
    }
    // Financial context (Plaid) - light touch
    if (ctx.financial?.recentTransactions && ctx.financial.recentTransactions.length > 0) {
        parts.push(`Recent financial activity noted.`);
    }
    if (parts.length === 0) {
        return 'No real-time life context available.';
    }
    return parts.join(' ');
}
// Simple in-memory session state (V0)
// Future: Graphiti persistence
const sessions = new Map();
/**
 * Role markers for Dave's known roles
 * Based on skill-jack patterns from .zosia/roles/
 */
const ROLE_MARKERS = {
    Engineer: {
        keywords: /\b(code|build|ship|architecture|monorepo|typescript|react|api|bug|deploy|brain.?garden|scala|technical|system)\b/i,
        contexts: ['technical work', 'problem solving', 'systems thinking'],
    },
    Father: {
        keywords: /\b(jules?|zoey|kids?|children|custody|week.?on|week.?off|school|activities|parenting|daughter|son)\b/i,
        contexts: ['family time', 'parenting', 'custody schedule'],
    },
    'Divorced Person': {
        keywords: /\b(nicole|divorce|support|court|legal|debt|loan|dad.?s money|\$40k|\$115k|financial|alimony)\b/i,
        contexts: ['financial stress', 'recovery', 'legal matters'],
    },
    Musician: {
        keywords: /\b(drums?|music|djent|rhythm|vanacore|creative|band|practice|play|instrument)\b/i,
        contexts: ['creative expression', 'meditation', 'identity'],
    },
    Freelancer: {
        keywords: /\b(client|consulting|freelance|contract|rate|\$\d+\/hr|engagement|side.?work|medical.?supply|wlmt|proposal)\b/i,
        contexts: ['side income', 'time allocation', 'client management'],
    },
};
/**
 * Role tensions - known conflicts between roles
 */
const ROLE_TENSIONS = [
    { roles: ['Engineer', 'Father'], conflict: 'Week-on time is precious; work deadlines compete with presence.' },
    { roles: ['Engineer', 'Freelancer'], conflict: 'Day job depletes creative energy needed for side work.' },
    { roles: ['Father', 'Freelancer'], conflict: 'Side work takes from available family time.' },
    { roles: ['Freelancer', 'Divorced Person'], conflict: 'All extra income goes to debt; freelancing pays for the past, not future.' },
    { roles: ['Musician', 'Engineer'], conflict: 'Creative self often gets pushed aside by builder demands.' },
];
/**
 * Detect active roles from message content
 */
function detectRoles(message) {
    const detectedRoles = [];
    for (const [role, { keywords, contexts }] of Object.entries(ROLE_MARKERS)) {
        const matches = message.match(keywords);
        if (matches) {
            detectedRoles.push({
                role,
                confidence: Math.min(0.9, 0.5 + matches.length * 0.15),
                markers_detected: [...new Set(matches.map(m => m.toLowerCase()))],
            });
        }
    }
    // Sort by confidence
    detectedRoles.sort((a, b) => b.confidence - a.confidence);
    // Determine primary role
    const primaryRole = detectedRoles[0]?.role || 'neutral';
    // Find applicable tensions
    const activeRoleNames = detectedRoles.map(r => r.role);
    const tensions = [];
    for (const tension of ROLE_TENSIONS) {
        if (activeRoleNames.includes(tension.roles[0]) && activeRoleNames.includes(tension.roles[1])) {
            tensions.push({ between: tension.roles, conflict: tension.conflict });
        }
    }
    // Generate felt texture
    let feltTexture = 'The moment is open, uncolored by specific concerns.';
    if (detectedRoles.length > 0) {
        const primary = detectedRoles[0];
        if (tensions.length > 0) {
            feltTexture = `The ${primary.role} is present, but ${tensions[0].conflict.toLowerCase()}`;
        }
        else {
            feltTexture = `The ${primary.role} shapes this moment.`;
        }
    }
    return {
        type: 'role_detection',
        active_roles: detectedRoles,
        primary_role: primaryRole,
        role_tensions: tensions,
        felt_texture: feltTexture,
    };
}
/**
 * Build initial Mindstate for a turn
 */
function buildMindstate(userId, message, previousTurns = [], contextBrief) {
    const lastTurn = previousTurns[previousTurns.length - 1];
    // Derive working memory from recent conversation + context brief
    const workingMemory = {
        lastTopic: lastTurn?.mindstate.workingMemory.lastTopic,
        emotionalBaseline: contextBrief?.detectedEmotion || 'neutral',
        openLoops: [],
        continuityAnchor: lastTurn?.mindstate.workingMemory.continuityAnchor
    };
    // Build rich situation snapshot using context brief
    let situationSnapshot;
    if (contextBrief) {
        situationSnapshot = buildEnrichedSnapshot(contextBrief, previousTurns.length === 0);
    }
    else {
        situationSnapshot = previousTurns.length === 0
            ? 'A new person is reaching out for the first time.'
            : `Continuing conversation. Last exchange was about ${workingMemory.lastTopic || 'various topics'}.`;
    }
    return {
        identityKernel: IDENTITY_KERNEL,
        workingMemory,
        associations: contextBrief?.relevantMemories || [],
        situationSnapshot
    };
}
/**
 * Build enriched situation snapshot from context brief
 * This is the "secret sauce" that makes the smaller model appear smarter
 *
 * Now includes role-aware experience synthesis - the "felt texture" of the moment
 */
function buildEnrichedSnapshot(brief, isNewConversation) {
    const parts = [];
    // EXPERIENCE BRIDGE - First and most important (role-aware felt context)
    // This is the We-layer → I-layer bridge that colors the response
    if (brief.experienceBridge) {
        parts.push(brief.experienceBridge);
    }
    // TEMPORAL CONTEXT (only if not already in experience bridge)
    if (brief.temporalFormatted && !brief.experienceBridge) {
        parts.push(brief.temporalFormatted);
    }
    // Emotional awareness (only if not in experience bridge)
    if (brief.detectedEmotion !== 'neutral' && !brief.experienceBridge) {
        parts.push(`The person seems ${brief.detectedEmotion}.`);
    }
    // Relationship context
    if (brief.relationshipHistory) {
        parts.push(brief.relationshipHistory);
    }
    else if (isNewConversation) {
        parts.push('This is a new person reaching out.');
    }
    // Intent understanding
    const intentDescriptions = {
        question: 'They have a question they want answered.',
        venting: 'They need to express something and be heard.',
        sharing: 'They want to share something with you.',
        request: 'They have a specific request.',
        greeting: 'They are greeting you.',
        continuation: 'They are continuing an earlier thread.'
    };
    parts.push(intentDescriptions[brief.primaryIntent] || '');
    // Role-specific experience bridge (psychological context)
    if (brief.roleContext && brief.roleContext.primary_role !== 'neutral') {
        const roleGuidance = ROLE_EXPERIENCE_BRIDGES[brief.roleContext.primary_role];
        if (roleGuidance) {
            parts.push(roleGuidance.trim());
        }
    }
    // Suggested approach
    if (brief.suggestedApproach) {
        parts.push(`Approach: ${brief.suggestedApproach}`);
    }
    // Memory-informed context
    if (brief.userPreferences.length > 0) {
        parts.push(`Remember: ${brief.userPreferences.join('; ')}`);
    }
    // Topics guidance
    if (brief.topicsToExplore.length > 0) {
        parts.push(`Could naturally explore: ${brief.topicsToExplore.join(', ')}`);
    }
    // Tone guidance
    if (brief.toneGuidance) {
        parts.push(`Tone: ${brief.toneGuidance}`);
    }
    // DATA LAYER - Real-time life context
    // This is the key addition: biometric/life data flows into every response
    if (brief.dataLayerFormatted) {
        parts.push(`Life context: ${brief.dataLayerFormatted}`);
    }
    return parts.filter(p => p).join('\n\n');
}
// Track if we've already surfaced temporal awareness this session
const temporalSurfacedThisSession = new Map();
/**
 * Assemble context brief using We-Layer (Claude)
 * This is the "brain" that makes the smaller model appear smarter
 */
async function assembleContextBrief(userId, message, previousTurns, debug) {
    const startTime = Date.now();
    if (debug) {
        console.log('\n┌─ WE-LAYER: ASSEMBLING CONTEXT ────────────────────────┐');
        console.log('│ Phase 1: Retrieving memories...');
    }
    // Phase 1: Retrieve memories from Graphiti
    const weLayerResult = await retrieveDeeper(userId, message, []);
    if (debug) {
        console.log(`│   Found ${weLayerResult.associations.length} associations (${weLayerResult.latencyMs}ms)`);
        console.log('│ Phase 2: Calculating temporal context...');
    }
    // Phase 2: Calculate REAL temporal context (time since last conversation)
    const alreadySurfaced = temporalSurfacedThisSession.get(userId) ?? false;
    let temporalContext = null;
    let temporalFormatted = null;
    try {
        temporalContext = await calculateTemporalContext(userId, alreadySurfaced);
        temporalFormatted = formatTemporalForMindstate(temporalContext);
        // Mark temporal as surfaced if it will be shown
        if (temporalContext.shouldSurface) {
            temporalSurfacedThisSession.set(userId, true);
        }
        if (debug) {
            console.log(`│   Gap: ${temporalContext.gap.humanReadable} (${temporalContext.gap.significance})`);
            console.log(`│   Time: ${temporalContext.timeOfDay.period}, ${temporalContext.dayOfWeek.day}`);
            if (temporalContext.shouldSurface) {
                console.log(`│   Surfacing: ${temporalContext.surfaceType} - "${temporalContext.feltSuggestion}"`);
            }
        }
    }
    catch (e) {
        if (debug) {
            console.log(`│   ⚠️ Temporal calculation failed: ${e instanceof Error ? e.message : 'unknown'}`);
        }
    }
    if (debug) {
        console.log('│ Phase 3: Analyzing context...');
    }
    // Phase 3: Analyze the message and context
    const analysis = analyzeMessage(message, previousTurns);
    // Phase 4: Extract user preferences from memories
    const userPreferences = extractUserPreferences(weLayerResult.associations);
    // Phase 5: Build relationship context
    const relationshipHistory = buildRelationshipContext(previousTurns, weLayerResult.associations);
    // Phase 6: Determine response approach
    const approach = determineApproach(analysis.intent, analysis.emotion, previousTurns.length);
    // Phase 5: Role detection
    if (debug) {
        console.log('│ Phase 5: Detecting active roles...');
    }
    const roleContext = detectRoles(message);
    if (debug && roleContext.active_roles.length > 0) {
        console.log(`│   Primary: ${roleContext.primary_role}`);
        console.log(`│   Active: ${roleContext.active_roles.map(r => r.role).join(', ')}`);
        if (roleContext.role_tensions.length > 0) {
            console.log(`│   Tensions: ${roleContext.role_tensions.length} detected`);
        }
    }
    // Phase 6: Experience synthesis
    if (debug) {
        console.log('│ Phase 6: Synthesizing experience...');
    }
    // Build context layers for experience synthesis
    const contextLayers = {
        memory: weLayerResult.associations.length > 0 ? {
            type: 'memory_retrieval',
            associations: weLayerResult.associations,
            synthesis: 'Memories surfaced from previous conversations.',
        } : null,
        emotion: {
            type: 'emotion_classification',
            primary: analysis.emotion,
            secondary: [],
            intensity: analysis.emotion !== 'neutral' ? 0.7 : 0.3,
            signals: [analysis.emotionalContext],
        },
        intent: {
            type: 'intent_recognition',
            primary_intent: analysis.intent,
            sub_intents: [],
            confidence: 0.8,
            needs: approach.explorableTopics,
        },
        roles: roleContext.active_roles.length > 0 ? roleContext : null,
        experience: null,
        temporal: temporalContext ? {
            gapSinceLastSession: temporalContext.gap.hours * 3600000,
            timeOfDay: temporalContext.timeOfDay.period,
        } : undefined,
    };
    // Synthesize mind state
    const mindStateFormatted = synthesizeMindState(contextLayers);
    // Generate experience bridge for I-layer
    const experienceBridge = generateExperienceBridgePrompt(mindStateFormatted);
    if (debug) {
        console.log(`│   Felt: ${mindStateFormatted.feltExperience.slice(0, 60)}...`);
    }
    // Phase 7: Data Layer - Real-time life context
    if (debug) {
        console.log('│ Phase 7: Fetching Data Layer context...');
    }
    let dataLayerContext = null;
    let dataLayerFormatted = null;
    try {
        dataLayerContext = await getDataLayerContext();
        if (dataLayerContext) {
            dataLayerFormatted = formatDataLayerForMindstate(dataLayerContext);
        }
        if (debug && dataLayerContext) {
            console.log(`│   Oura: ${dataLayerContext.oura ? `Sleep ${dataLayerContext.oura.sleep?.score ?? '?'}/100, Readiness ${dataLayerContext.oura.readiness?.score ?? '?'}/100` : 'N/A'}`);
            console.log(`│   Spotify: ${dataLayerContext.spotify?.recentlyPlayed?.length ?? 0} tracks`);
            console.log(`│   Calendar: ${dataLayerContext.calendar?.today?.length ?? 0} events`);
            console.log(`│   Gmail: ${dataLayerContext.gmail?.unreadCount ?? 0} unread`);
            console.log(`│   RescueTime: ${dataLayerContext.rescueTime?.productivityScore ?? 'N/A'}%`);
        }
    }
    catch (e) {
        if (debug) {
            console.log(`│   ⚠️ Data Layer fetch failed: ${e instanceof Error ? e.message : 'unknown'}`);
        }
    }
    const processingTimeMs = Date.now() - startTime;
    if (debug) {
        console.log(`│ Context assembled in ${processingTimeMs}ms`);
        console.log('│');
        console.log(`│ 📊 Analysis:`);
        console.log(`│   Emotion: ${analysis.emotion}`);
        console.log(`│   Intent: ${analysis.intent}`);
        console.log(`│   Depth: ${approach.depth}`);
        console.log(`│   Tone: ${approach.tone}`);
        if (userPreferences.length > 0) {
            console.log(`│   Preferences: ${userPreferences.join(', ')}`);
        }
        if (weLayerResult.associations.length > 0) {
            console.log('│');
            console.log('│ 🧠 Surfaced Memories:');
            for (const assoc of weLayerResult.associations.slice(0, 3)) {
                console.log(`│   • [${assoc.type}] ${assoc.text.slice(0, 50)}...`);
            }
        }
        if (roleContext.active_roles.length > 0) {
            console.log('│');
            console.log('│ 🎭 Role Context:');
            console.log(`│   • Primary: ${roleContext.primary_role}`);
            for (const role of roleContext.active_roles) {
                console.log(`│   • ${role.role} (${(role.confidence * 100).toFixed(0)}%): ${role.markers_detected.join(', ')}`);
            }
            if (roleContext.role_tensions.length > 0) {
                console.log('│   Tensions:');
                for (const tension of roleContext.role_tensions) {
                    console.log(`│     ${tension.between[0]} ↔ ${tension.between[1]}`);
                }
            }
        }
        if (temporalContext) {
            console.log('│');
            console.log('│ ⏰ Temporal Awareness:');
            console.log(`│   • Last conversation: ${temporalContext.gap.humanReadable}`);
            console.log(`│   • Time: ${temporalContext.timeOfDay.period} (${temporalContext.timeOfDay.hour}:00)`);
            console.log(`│   • Day: ${temporalContext.dayOfWeek.day}${temporalContext.dayOfWeek.isWeekend ? ' (weekend)' : ''}`);
            if (temporalContext.pendingEvents.length > 0) {
                console.log(`│   • Events: ${temporalContext.pendingEvents.length} tracked`);
            }
        }
        if (dataLayerFormatted) {
            console.log('│');
            console.log('│ 🌡️ Life Context (Data Layer):');
            console.log(`│   ${dataLayerFormatted.slice(0, 80)}...`);
        }
        console.log('└────────────────────────────────────────────────────────┘');
    }
    return {
        relevantMemories: weLayerResult.associations,
        userPreferences,
        relationshipHistory,
        temporalContext,
        temporalFormatted,
        detectedEmotion: analysis.emotion,
        emotionalContext: analysis.emotionalContext,
        primaryIntent: analysis.intent,
        suggestedApproach: approach.suggestion,
        topicsToAvoid: [],
        topicsToExplore: approach.explorableTopics,
        toneGuidance: approach.tone,
        depthGuidance: approach.depth,
        roleContext,
        experienceBridge,
        mindStateFormatted,
        dataLayerContext,
        dataLayerFormatted,
        processingTimeMs
    };
}
/**
 * Analyze message for emotion and intent
 */
function analyzeMessage(message, previousTurns) {
    const lowerMessage = message.toLowerCase();
    // Simple emotion detection (future: use Claude for this)
    let emotion = 'neutral';
    let emotionalContext = '';
    if (/\b(sad|upset|hurt|down|depressed|lonely)\b/.test(lowerMessage)) {
        emotion = 'sad';
        emotionalContext = 'They may need support and validation.';
    }
    else if (/\b(angry|frustrated|annoyed|mad|pissed)\b/.test(lowerMessage)) {
        emotion = 'frustrated';
        emotionalContext = 'They may need to be heard before solutions.';
    }
    else if (/\b(worried|anxious|scared|nervous|afraid)\b/.test(lowerMessage)) {
        emotion = 'anxious';
        emotionalContext = 'They may need reassurance and grounding.';
    }
    else if (/\b(happy|excited|great|wonderful|amazing)\b/.test(lowerMessage)) {
        emotion = 'positive';
        emotionalContext = 'They are in good spirits. Match their energy.';
    }
    else if (/\b(confused|lost|uncertain|unsure)\b/.test(lowerMessage)) {
        emotion = 'confused';
        emotionalContext = 'They need clarity and guidance.';
    }
    // Intent classification
    let intent = 'sharing';
    if (/\?$/.test(message.trim()) || /^(what|how|why|when|where|who|can|could|would|should|is|are|do|does)\b/i.test(message)) {
        intent = 'question';
    }
    else if (/^(hi|hey|hello|good morning|good evening)\b/i.test(message)) {
        intent = 'greeting';
    }
    else if (/\b(please|can you|could you|would you|help|need)\b/i.test(lowerMessage)) {
        intent = 'request';
    }
    else if (emotion === 'sad' || emotion === 'frustrated' || emotion === 'anxious') {
        intent = 'venting';
    }
    else if (previousTurns.length > 0) {
        intent = 'continuation';
    }
    return { emotion, emotionalContext, intent };
}
/**
 * Extract user preferences from memory associations
 */
function extractUserPreferences(associations) {
    const preferences = [];
    for (const assoc of associations) {
        if (assoc.type === 'preference' || assoc.type === 'teaching') {
            preferences.push(assoc.text);
        }
    }
    return preferences.slice(0, 3); // Keep it focused
}
/**
 * Build relationship context from history
 */
function buildRelationshipContext(previousTurns, associations) {
    if (previousTurns.length === 0 && associations.length === 0) {
        return null;
    }
    if (previousTurns.length > 10) {
        return 'This is someone you know well. You have history together.';
    }
    else if (previousTurns.length > 0) {
        return 'You are getting to know this person.';
    }
    else if (associations.length > 0) {
        return 'You have memories of this person from before.';
    }
    return null;
}
/**
 * Determine response approach based on analysis
 */
function determineApproach(intent, emotion, turnCount) {
    let suggestion = '';
    let tone = 'warm and present';
    let depth = 'moderate';
    const explorableTopics = [];
    switch (intent) {
        case 'greeting':
            suggestion = 'Acknowledge warmly. Keep it light but genuine.';
            depth = 'brief';
            break;
        case 'question':
            suggestion = 'Answer thoughtfully. Draw on what you know about them.';
            depth = 'moderate';
            break;
        case 'venting':
            suggestion = 'Listen first. Validate their feelings before offering perspective.';
            tone = 'gentle and supportive';
            depth = 'deep';
            break;
        case 'request':
            suggestion = 'Be helpful but stay within your nature.';
            depth = 'moderate';
            break;
        case 'sharing':
            suggestion = 'Engage with genuine curiosity. Ask follow-ups.';
            explorableTopics.push('what this means to them');
            depth = 'moderate';
            break;
        case 'continuation':
            suggestion = 'Build on where you left off. Show you remember.';
            depth = 'moderate';
            break;
    }
    // Adjust for emotion
    if (emotion === 'anxious' || emotion === 'sad') {
        tone = 'gentle, grounding, and supportive';
        depth = 'deep';
    }
    else if (emotion === 'positive') {
        tone = 'warm and matching their energy';
    }
    return { suggestion, tone, depth, explorableTopics };
}
/**
 * Main chat function - Context-First Architecture
 *
 * Flow:
 * 1. We-Layer runs FIRST → assembles rich context
 * 2. I-Layer receives context → responds naturally
 *
 * This is the key: Claude does the thinking, the conscious layer does the talking.
 */
export async function chat(message, options) {
    const { userId, debug } = options;
    const turnId = `turn_${Date.now()}`;
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 0: INITIALIZE DATA LAYER
    // Connect to real-time life context (Oura, Spotify, Calendar, etc.)
    // ═══════════════════════════════════════════════════════════════════
    await initializeDataLayer(debug ?? false);
    // Get or create session
    let session = sessions.get(userId);
    if (!session) {
        session = { turns: [], lastMindstate: buildMindstate(userId, message) };
        sessions.set(userId, session);
    }
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: WE-LAYER RUNS FIRST
    // The unconscious assembles rich context before the conscious speaks
    // ═══════════════════════════════════════════════════════════════════
    const contextBrief = await assembleContextBrief(userId, message, session.turns, debug ?? false);
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: BUILD ENRICHED MINDSTATE
    // The context brief becomes the foundation for the conscious response
    // ═══════════════════════════════════════════════════════════════════
    const mindstate = buildMindstate(userId, message, session.turns, contextBrief);
    if (debug) {
        console.log('\n┌─ ENRICHED MINDSTATE ──────────────────────────────────┐');
        console.log(`│ User: ${userId}`);
        console.log(`│ Emotion: ${contextBrief.detectedEmotion}`);
        console.log(`│ Intent: ${contextBrief.primaryIntent}`);
        console.log(`│ Associations: ${mindstate.associations.length}`);
        console.log(`│ Depth: ${contextBrief.depthGuidance}`);
        console.log('│');
        console.log(`│ 📝 Situation: ${mindstate.situationSnapshot.slice(0, 100)}...`);
        console.log('└────────────────────────────────────────────────────────┘');
    }
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: I-LAYER RESPONDS WITH PRE-ASSEMBLED CONTEXT
    // The conscious layer just needs to "speak" - the thinking is done
    // ═══════════════════════════════════════════════════════════════════
    if (debug) {
        console.log('\n┌─ I-LAYER: RESPONDING ─────────────────────────────────┐');
    }
    const iLayerResult = await callConscious(mindstate, message, { debug, images: options.images });
    if (debug) {
        console.log(`│ Model: ${iLayerResult.model}`);
        console.log(`│ Latency: ${iLayerResult.latencyMs}ms`);
        if (iLayerResult.promptTokens) {
            console.log(`│ Tokens: ${iLayerResult.promptTokens} in / ${iLayerResult.completionTokens} out`);
        }
        if (iLayerResult.costUsd !== undefined) {
            console.log(`│ Cost: $${iLayerResult.costUsd.toFixed(6)}`);
        }
        console.log('└────────────────────────────────────────────────────────┘');
    }
    const finalResponse = iLayerResult.response;
    const finalMindstate = mindstate;
    // Increment session count for cost tracking
    incrementSessionCount();
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4: BUILD DEBUG INFO
    // Reflects the context-first architecture
    // ═══════════════════════════════════════════════════════════════════
    const debugInfo = {
        iLayer: {
            model: iLayerResult.model,
            latencyMs: iLayerResult.latencyMs,
            promptTokens: iLayerResult.promptTokens,
            completionTokens: iLayerResult.completionTokens
        },
        weLayer: {
            activated: true, // Always runs first now
            graphitiQueries: 1, // Context assembly always queries
            associationsDistilled: contextBrief.relevantMemories.length,
            latencyMs: contextBrief.processingTimeMs
        },
        contextBrief: {
            emotion: contextBrief.detectedEmotion,
            intent: contextBrief.primaryIntent,
            depth: contextBrief.depthGuidance,
            memoriesUsed: contextBrief.relevantMemories.length,
            processingTimeMs: contextBrief.processingTimeMs
        },
        mindstateVersion: session.turns.length + 1
    };
    // Create turn record
    const turn = {
        turnId,
        userId,
        timestamp: new Date(),
        userMessage: message,
        response: finalResponse,
        mindstate: finalMindstate,
        debug: debug ? debugInfo : undefined
    };
    // Update session
    session.turns.push(turn);
    session.lastMindstate = finalMindstate;
    // Update working memory for next turn
    finalMindstate.workingMemory.lastTopic = extractTopic(message);
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 5: PERSIST TO MEMORY AND RECORD TIMESTAMP (NON-BLOCKING)
    // ═══════════════════════════════════════════════════════════════════
    persistConversation(userId, message, finalResponse, debug).catch((err) => {
        if (debug) {
            console.log(`│ ⚠️ Memory persistence failed: ${err.message}`);
        }
    });
    // Record session timestamp for temporal tracking
    recordSessionTimestamp(userId).catch((err) => {
        if (debug) {
            console.log(`│ ⚠️ Session timestamp failed: ${err instanceof Error ? err.message : 'unknown'}`);
        }
    });
    if (debug) {
        console.log('\n┌─ TURN COMPLETE ───────────────────────────────────────┐');
        console.log(`│ Total latency: ${contextBrief.processingTimeMs + iLayerResult.latencyMs}ms`);
        console.log(`│   • Context assembly: ${contextBrief.processingTimeMs}ms`);
        console.log(`│   • Response generation: ${iLayerResult.latencyMs}ms`);
        console.log('└────────────────────────────────────────────────────────┘');
    }
    return turn;
}
/**
 * Streaming chat function - Context-First Architecture with SSE
 *
 * Yields events as they happen:
 * - Phase transitions (for UI updates)
 * - Context brief data (when We-Layer completes)
 * - Token chunks (as I-Layer streams response)
 * - Done (with final Turn object)
 */
export async function* chatStream(message, options) {
    const { userId, debug } = options;
    const turnId = `turn_${Date.now()}`;
    // Initialize Data Layer for streaming sessions too
    await initializeDataLayer(debug ?? false);
    // Get or create session
    let session = sessions.get(userId);
    if (!session) {
        session = { turns: [], lastMindstate: buildMindstate(userId, message) };
        sessions.set(userId, session);
    }
    // Phase: Receiving
    yield { type: 'phase', phase: 'receiving' };
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: WE-LAYER RUNS FIRST (Unconscious)
    // ═══════════════════════════════════════════════════════════════════
    yield { type: 'phase', phase: 'unconscious' };
    const contextBrief = await assembleContextBrief(userId, message, session.turns, debug ?? false);
    // Emit context brief data
    yield {
        type: 'context',
        data: {
            emotion: contextBrief.detectedEmotion,
            intent: contextBrief.primaryIntent,
            depth: contextBrief.depthGuidance,
            memories: contextBrief.relevantMemories.length,
        },
    };
    // Phase: Integrating
    yield { type: 'phase', phase: 'integrating' };
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: BUILD ENRICHED MINDSTATE
    // ═══════════════════════════════════════════════════════════════════
    const mindstate = buildMindstate(userId, message, session.turns, contextBrief);
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: I-LAYER STREAMS RESPONSE (Conscious)
    // ═══════════════════════════════════════════════════════════════════
    yield { type: 'phase', phase: 'conscious' };
    const startTime = Date.now();
    let fullResponse = '';
    try {
        for await (const chunk of streamConscious(mindstate, message, { images: options.images })) {
            fullResponse += chunk;
            yield { type: 'token', content: chunk };
        }
    }
    catch (error) {
        yield { type: 'error', error: error instanceof Error ? error.message : 'Stream error' };
        return;
    }
    const latencyMs = Date.now() - startTime;
    // Phase: Responding (all tokens received)
    yield { type: 'phase', phase: 'responding' };
    // Increment session count for cost tracking
    incrementSessionCount();
    // Build debug info
    const debugInfo = {
        iLayer: {
            model: 'configured-model', // TODO: get from config
            latencyMs,
        },
        weLayer: {
            activated: true,
            associationsDistilled: contextBrief.relevantMemories.length,
            latencyMs: contextBrief.processingTimeMs,
        },
        contextBrief: {
            emotion: contextBrief.detectedEmotion,
            intent: contextBrief.primaryIntent,
            depth: contextBrief.depthGuidance,
            memoriesUsed: contextBrief.relevantMemories.length,
            processingTimeMs: contextBrief.processingTimeMs,
        },
        mindstateVersion: session.turns.length + 1,
    };
    // Create turn record
    const turn = {
        turnId,
        userId,
        timestamp: new Date(),
        userMessage: message,
        response: fullResponse,
        mindstate,
        debug: debug ? debugInfo : undefined,
    };
    // Update session
    session.turns.push(turn);
    session.lastMindstate = mindstate;
    mindstate.workingMemory.lastTopic = extractTopic(message);
    // Phase: Remembering (persisting)
    yield { type: 'phase', phase: 'remembering' };
    // Persist (non-blocking)
    persistConversation(userId, message, fullResponse, debug).catch(() => { });
    // Record session timestamp for temporal tracking
    recordSessionTimestamp(userId).catch(() => { });
    // Done
    yield { type: 'done', turn };
}
/**
 * Simple topic extraction (V0)
 * Future: Use NLP or Claude for better extraction
 */
function extractTopic(message) {
    // Just take first few words as topic indicator
    const words = message.split(' ').slice(0, 5);
    return words.join(' ') + (message.split(' ').length > 5 ? '...' : '');
}
/**
 * Get session history for a user
 */
export function getSession(userId) {
    return sessions.get(userId);
}
/**
 * Clear session for testing
 */
export function clearSession(userId) {
    sessions.delete(userId);
}
