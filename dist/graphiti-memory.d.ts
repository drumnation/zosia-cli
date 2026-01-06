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
import type { Association } from './types.js';
interface SearchResult {
    facts: Array<{
        uuid: string;
        name: string;
        fact: string;
        valid_at?: string;
        invalid_at?: string;
        created_at: string;
    }>;
    nodes?: Array<{
        uuid: string;
        name: string;
        summary?: string;
        created_at: string;
    }>;
}
/**
 * Check if Graphiti service is available
 */
export declare function checkGraphitiHealth(): Promise<{
    healthy: boolean;
    latencyMs: number;
}>;
/**
 * Search Graphiti for relevant facts about the user/topic
 *
 * Uses the user's configured embedding provider to generate query embeddings
 * locally, then sends the vector to Graphiti for efficient search.
 */
export declare function searchMemories(userId: string, query: string, options?: {
    maxFacts?: number;
    debug?: boolean;
    useLocalEmbedding?: boolean;
}): Promise<{
    facts: SearchResult['facts'];
    latencyMs: number;
    embeddingProvider?: string;
}>;
/**
 * Convert Graphiti facts to Zosia associations
 */
export declare function factsToAssociations(facts: SearchResult['facts']): Association[];
/**
 * Store a conversation turn in Graphiti
 */
export declare function storeConversation(userId: string, userMessage: string, assistantResponse: string, options?: {
    sessionName?: string;
    debug?: boolean;
}): Promise<{
    success: boolean;
    latencyMs: number;
}>;
/**
 * Store a user learning/teaching in Graphiti
 */
export declare function storeTeaching(userId: string, topic: string, teaching: string, options?: {
    debug?: boolean;
}): Promise<{
    success: boolean;
    latencyMs: number;
}>;
export {};
//# sourceMappingURL=graphiti-memory.d.ts.map