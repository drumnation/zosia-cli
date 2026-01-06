/**
 * Graphiti Memory Client for Zosia
 *
 * Connects to Graphiti temporal knowledge graph on Hetzner Cloud.
 * Enables the We-layer to retrieve real memories and store new ones.
 *
 * Group ID Convention:
 * - zosia-core: System identity, personality constants
 * - zosia-{userId}: User learnings, preferences, relationship
 * - zosia-{userId}-sessions: Session summaries, continuity data
 * - zosia-{userId}-tasks: Commitments, follow-ups, pending items
 */
import { embedQuery, isEmbeddingAvailable } from './embedding-client.js';
// Graphiti API configuration
const GRAPHITI_URL = process.env.GRAPHITI_URL || 'http://91.99.27.146:8000';
/**
 * Build group IDs for a user
 * Includes collective wisdom layer that all users share
 */
function buildGroupIds(userId) {
    return [
        'zosia-core', // System identity, personality
        'zosia-collective', // Anonymized shared wisdom from all users
        `zosia-${userId}`, // User-specific learnings
        `zosia-${userId}-sessions`,
        `zosia-${userId}-tasks`,
    ];
}
/**
 * Check if Graphiti service is available
 */
export async function checkGraphitiHealth() {
    const start = Date.now();
    try {
        const response = await fetch(`${GRAPHITI_URL}/healthcheck`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            return { healthy: false, latencyMs: Date.now() - start };
        }
        const data = await response.json();
        return {
            healthy: data.status === 'healthy',
            latencyMs: Date.now() - start
        };
    }
    catch {
        return { healthy: false, latencyMs: Date.now() - start };
    }
}
/**
 * Search Graphiti for relevant facts about the user/topic
 *
 * Uses the user's configured embedding provider to generate query embeddings
 * locally, then sends the vector to Graphiti for efficient search.
 */
export async function searchMemories(userId, query, options = {}) {
    const start = Date.now();
    const { maxFacts = 5, debug = false, useLocalEmbedding = true } = options;
    const groupIds = buildGroupIds(userId);
    if (debug) {
        console.log(`│ 🔍 Graphiti query: "${query.slice(0, 40)}..."`);
        console.log(`│ 📂 Groups: ${groupIds.join(', ')}`);
    }
    // Try to embed locally using user's configured provider
    let queryVector;
    let embeddingProvider;
    if (useLocalEmbedding) {
        try {
            const embeddingAvailable = await isEmbeddingAvailable();
            if (embeddingAvailable) {
                const embeddingResult = await embedQuery(query, { debug });
                queryVector = embeddingResult.vector;
                embeddingProvider = embeddingResult.provider;
            }
            else if (debug) {
                console.log(`│ ℹ️ No embedding provider available, using server-side embedding`);
            }
        }
        catch (error) {
            if (debug) {
                console.log(`│ ⚠️ Local embedding failed, falling back to server: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
            // Continue without local embedding - server will handle it
        }
    }
    try {
        const searchPayload = {
            query,
            group_ids: groupIds,
            max_facts: maxFacts,
        };
        // Include query_vector if we successfully embedded locally
        if (queryVector) {
            searchPayload.query_vector = queryVector;
        }
        const response = await fetch(`${GRAPHITI_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchPayload),
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            const error = await response.text();
            if (debug) {
                console.log(`│ ⚠️ Graphiti error: ${response.status} - ${error.slice(0, 50)}`);
            }
            return { facts: [], latencyMs: Date.now() - start };
        }
        const data = await response.json();
        if (debug) {
            const embeddingInfo = embeddingProvider ? ` via ${embeddingProvider}` : ' (server embedding)';
            console.log(`│ ✓ Found ${data.facts?.length || 0} facts (${Date.now() - start}ms${embeddingInfo})`);
        }
        return {
            facts: data.facts || [],
            latencyMs: Date.now() - start,
            embeddingProvider,
        };
    }
    catch (error) {
        if (debug) {
            console.log(`│ ⚠️ Graphiti unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return { facts: [], latencyMs: Date.now() - start };
    }
}
/**
 * Convert Graphiti facts to Zosia associations
 */
export function factsToAssociations(facts) {
    return facts.map((fact) => {
        // Determine association type based on fact content
        let type = 'RECALL';
        let intensity = 'medium';
        const lowerFact = fact.fact.toLowerCase();
        // Heuristics for association types
        if (lowerFact.includes('prefer') || lowerFact.includes('like') || lowerFact.includes('want')) {
            type = 'PULL';
            intensity = 'medium';
        }
        else if (lowerFact.includes('concern') || lowerFact.includes('worry') || lowerFact.includes('struggle')) {
            type = 'SIGN';
            intensity = 'strong';
        }
        else if (lowerFact.includes('might') || lowerFact.includes('perhaps') || lowerFact.includes('seem')) {
            type = 'HUNCH';
            intensity = 'faint';
        }
        else {
            type = 'RECALL';
            intensity = 'strong';
        }
        return {
            type,
            intensity,
            text: fact.fact,
            source: 'graphiti',
        };
    });
}
/**
 * Store a conversation turn in Graphiti
 */
export async function storeConversation(userId, userMessage, assistantResponse, options = {}) {
    const start = Date.now();
    const { sessionName = `session-${new Date().toISOString().split('T')[0]}`, debug = false } = options;
    const groupId = `zosia-${userId}-sessions`;
    const timestamp = new Date().toISOString();
    if (debug) {
        console.log(`│ 💾 Storing conversation to ${groupId}`);
    }
    const messages = [
        {
            content: userMessage,
            role_type: 'user',
            role: userId,
            name: sessionName,
            timestamp,
            source_description: 'zosia-cli',
        },
        {
            content: assistantResponse,
            role_type: 'assistant',
            role: 'Zosia',
            name: sessionName,
            timestamp: new Date().toISOString(),
            source_description: 'zosia-cli',
        },
    ];
    try {
        const response = await fetch(`${GRAPHITI_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                group_id: groupId,
                messages,
            }),
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
            const error = await response.text();
            if (debug) {
                console.log(`│ ⚠️ Store failed: ${response.status} - ${error.slice(0, 50)}`);
            }
            return { success: false, latencyMs: Date.now() - start };
        }
        if (debug) {
            console.log(`│ ✓ Stored (${Date.now() - start}ms)`);
        }
        return { success: true, latencyMs: Date.now() - start };
    }
    catch (error) {
        if (debug) {
            console.log(`│ ⚠️ Store error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
        return { success: false, latencyMs: Date.now() - start };
    }
}
/**
 * Store a user learning/teaching in Graphiti
 */
export async function storeTeaching(userId, topic, teaching, options = {}) {
    const start = Date.now();
    const { debug = false } = options;
    const groupId = `zosia-${userId}`;
    const timestamp = new Date().toISOString();
    if (debug) {
        console.log(`│ 📚 Storing teaching about "${topic}" to ${groupId}`);
    }
    const messages = [
        {
            content: `${userId} taught Zosia about ${topic}: "${teaching}"`,
            role_type: 'system',
            role: 'teaching',
            name: `teaching-${topic.toLowerCase().replace(/\s+/g, '-')}`,
            timestamp,
            source_description: 'zosia-cli-teaching',
        },
    ];
    try {
        const response = await fetch(`${GRAPHITI_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                group_id: groupId,
                messages,
            }),
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
            return { success: false, latencyMs: Date.now() - start };
        }
        if (debug) {
            console.log(`│ ✓ Teaching stored (${Date.now() - start}ms)`);
        }
        return { success: true, latencyMs: Date.now() - start };
    }
    catch {
        return { success: false, latencyMs: Date.now() - start };
    }
}
