/**
 * Role Knowledge Storage
 *
 * Stores processed role knowledge in Graphiti with role-specific group IDs.
 * Handles expiry calculation, metadata enrichment, and duplicate prevention.
 */
import type { FetchedItem } from './role-knowledge-domain.js';
/** Metadata for stored role knowledge */
export interface RoleKnowledgeMetadata {
    sourceId: string;
    sourceName: string;
    originalUrl: string;
    relevanceScore: number;
    fetchedAt: string;
    expiresAt: string;
    frequency: 'hourly' | 'daily' | 'weekly';
}
/** Result of storage operation */
export interface StorageResult {
    success: boolean;
    stored: number;
    skipped: number;
    errors: string[];
    latencyMs: number;
}
/** Knowledge item returned from Graphiti query */
export interface QueriedKnowledge {
    id: string;
    roleId: string;
    summary: string;
    fetchedAt: Date;
    sourceId: string;
    originalUrl: string;
    relevanceScore: number;
}
/**
 * Get the Graphiti group ID for a role.
 */
export declare function getRoleGroupId(roleId: string): string;
/**
 * Calculate expiry date based on source frequency.
 */
export declare function calculateExpiry(frequency: 'hourly' | 'daily' | 'weekly', fetchedAt?: Date): Date;
/**
 * Generate episode name for role knowledge.
 */
export declare function generateEpisodeName(roleId: string): string;
/**
 * Check if a URL has already been stored (in-memory cache).
 */
export declare function isUrlStored(url: string): boolean;
/**
 * Mark a URL as stored (add to in-memory cache).
 */
export declare function markUrlStored(url: string): void;
/**
 * Clear stored URLs cache (for testing).
 */
export declare function clearStoredUrlsCache(): void;
/**
 * Store role knowledge items in Graphiti.
 *
 * @param roleId - The role identifier (e.g., 'engineer', 'father')
 * @param items - Fetched items to store
 * @param source - Source configuration for metadata
 * @returns Storage result with counts and any errors
 */
export declare function storeRoleKnowledge(roleId: string, items: FetchedItem[], source: {
    id: string;
    name: string;
    relevanceScore: number;
    updateFrequency: 'hourly' | 'daily' | 'weekly';
}): Promise<StorageResult>;
/**
 * Query role knowledge from Graphiti.
 *
 * @param roleId - The role identifier
 * @param query - Search query
 * @param options - Search options
 * @returns Array of queried knowledge items
 */
export declare function queryRoleKnowledge(roleId: string, query: string, options?: {
    maxFacts?: number;
}): Promise<QueriedKnowledge[]>;
/**
 * Create the callback function for KnowledgeWorker.
 *
 * This factory creates a fetch callback that stores items in Graphiti
 * using the appropriate role group ID and source metadata.
 */
export declare function createStorageCallback(sourceMap: Map<string, {
    id: string;
    name: string;
    relevanceScore: number;
    updateFrequency: 'hourly' | 'daily' | 'weekly';
}>): (roleId: string, sourceId: string, items: FetchedItem[]) => Promise<void>;
/**
 * Build source map from role configurations for use with createStorageCallback.
 */
export declare function buildSourceMap(roles: Array<{
    roleId: string;
    newsSources: Array<{
        id: string;
        name: string;
        relevanceScore: number;
        updateFrequency: 'hourly' | 'daily' | 'weekly';
    }>;
}>): Map<string, {
    id: string;
    name: string;
    relevanceScore: number;
    updateFrequency: 'hourly' | 'daily' | 'weekly';
}>;
//# sourceMappingURL=role-knowledge-storage.d.ts.map