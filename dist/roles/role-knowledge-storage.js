/**
 * Role Knowledge Storage
 *
 * Stores processed role knowledge in Graphiti with role-specific group IDs.
 * Handles expiry calculation, metadata enrichment, and duplicate prevention.
 */
// Graphiti API configuration
const GRAPHITI_URL = process.env.GRAPHITI_URL || 'http://91.99.27.146:8000';
/** Group ID prefix for role-specific knowledge */
const ROLE_GROUP_PREFIX = 'zosia-role-';
/** Expiry durations by source frequency (in milliseconds) */
const EXPIRY_DURATIONS = {
    hourly: 24 * 60 * 60 * 1000, // 24 hours
    daily: 7 * 24 * 60 * 60 * 1000, // 7 days
    weekly: 30 * 24 * 60 * 60 * 1000, // 30 days
};
/** In-memory set of stored URLs to prevent duplicates */
const storedUrls = new Set();
/**
 * Get the Graphiti group ID for a role.
 */
export function getRoleGroupId(roleId) {
    return `${ROLE_GROUP_PREFIX}${roleId}`;
}
/**
 * Calculate expiry date based on source frequency.
 */
export function calculateExpiry(frequency, fetchedAt = new Date()) {
    const expiryMs = EXPIRY_DURATIONS[frequency];
    return new Date(fetchedAt.getTime() + expiryMs);
}
/**
 * Generate episode name for role knowledge.
 */
export function generateEpisodeName(roleId) {
    return `role-knowledge-${roleId}-${Date.now()}`;
}
/**
 * Check if a URL has already been stored (in-memory cache).
 */
export function isUrlStored(url) {
    return storedUrls.has(url);
}
/**
 * Mark a URL as stored (add to in-memory cache).
 */
export function markUrlStored(url) {
    storedUrls.add(url);
}
/**
 * Clear stored URLs cache (for testing).
 */
export function clearStoredUrlsCache() {
    storedUrls.clear();
}
/**
 * Build knowledge episode content from fetched item with metadata.
 */
function buildEpisodeContent(item, source, frequency) {
    const fetchedAt = new Date();
    const expiresAt = calculateExpiry(frequency, fetchedAt);
    const metadata = {
        sourceId: source.id,
        sourceName: source.name,
        originalUrl: item.url,
        relevanceScore: source.relevanceScore,
        fetchedAt: fetchedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        frequency,
    };
    // Content format for storage
    const content = [
        `# ${item.title}`,
        '',
        item.content,
        '',
        `---`,
        `Source: ${source.name}`,
        `URL: ${item.url}`,
        `Relevance: ${(source.relevanceScore * 100).toFixed(0)}%`,
        item.pubDate ? `Published: ${item.pubDate.toISOString()}` : '',
        `Fetched: ${metadata.fetchedAt}`,
        `Expires: ${metadata.expiresAt}`,
    ].filter(Boolean).join('\n');
    return { content, metadata };
}
/**
 * Store role knowledge items in Graphiti.
 *
 * @param roleId - The role identifier (e.g., 'engineer', 'father')
 * @param items - Fetched items to store
 * @param source - Source configuration for metadata
 * @returns Storage result with counts and any errors
 */
export async function storeRoleKnowledge(roleId, items, source) {
    const start = Date.now();
    const groupId = getRoleGroupId(roleId);
    const result = {
        success: true,
        stored: 0,
        skipped: 0,
        errors: [],
        latencyMs: 0,
    };
    // Filter out duplicates
    const newItems = items.filter((item) => {
        if (isUrlStored(item.url)) {
            result.skipped++;
            return false;
        }
        return true;
    });
    if (newItems.length === 0) {
        result.latencyMs = Date.now() - start;
        return result;
    }
    // Store each item
    for (const item of newItems) {
        try {
            const { content, metadata } = buildEpisodeContent(item, source, source.updateFrequency);
            const messages = [
                {
                    content,
                    role_type: 'system',
                    role: 'role-knowledge',
                    name: generateEpisodeName(roleId),
                    timestamp: metadata.fetchedAt,
                    source_description: `role-knowledge-${roleId}-${source.id}`,
                },
            ];
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
                const errorText = await response.text();
                result.errors.push(`Failed to store "${item.title.slice(0, 30)}...": ${response.status} - ${errorText.slice(0, 50)}`);
                result.success = false;
            }
            else {
                markUrlStored(item.url);
                result.stored++;
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.errors.push(`Error storing "${item.title.slice(0, 30)}...": ${message}`);
            result.success = false;
        }
    }
    result.latencyMs = Date.now() - start;
    return result;
}
/**
 * Query role knowledge from Graphiti.
 *
 * @param roleId - The role identifier
 * @param query - Search query
 * @param options - Search options
 * @returns Array of queried knowledge items
 */
export async function queryRoleKnowledge(roleId, query, options = {}) {
    const groupId = getRoleGroupId(roleId);
    const { maxFacts = 10 } = options;
    try {
        const response = await fetch(`${GRAPHITI_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                group_ids: [groupId],
                max_facts: maxFacts,
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        // Convert facts to ProcessedKnowledge format
        return (data.facts || []).map((fact) => ({
            id: fact.uuid,
            roleId,
            summary: fact.fact,
            fetchedAt: new Date(fact.created_at),
            // These would need to be extracted from the fact content in a real implementation
            sourceId: 'unknown',
            originalUrl: '',
            relevanceScore: 0.5,
        }));
    }
    catch {
        return [];
    }
}
/**
 * Create the callback function for KnowledgeWorker.
 *
 * This factory creates a fetch callback that stores items in Graphiti
 * using the appropriate role group ID and source metadata.
 */
export function createStorageCallback(sourceMap) {
    return async (roleId, sourceId, items) => {
        const source = sourceMap.get(sourceId);
        if (!source) {
            console.log(`[RoleKnowledgeStorage] Unknown source: ${sourceId}`);
            return;
        }
        const result = await storeRoleKnowledge(roleId, items, source);
        if (result.stored > 0) {
            console.log(`[RoleKnowledgeStorage] Stored ${result.stored} items for ${roleId}/${sourceId}`);
        }
        if (result.skipped > 0) {
            console.log(`[RoleKnowledgeStorage] Skipped ${result.skipped} duplicates for ${roleId}/${sourceId}`);
        }
        if (result.errors.length > 0) {
            console.error(`[RoleKnowledgeStorage] Errors:`, result.errors);
        }
    };
}
/**
 * Build source map from role configurations for use with createStorageCallback.
 */
export function buildSourceMap(roles) {
    const map = new Map();
    for (const role of roles) {
        for (const source of role.newsSources) {
            map.set(source.id, {
                id: source.id,
                name: source.name,
                relevanceScore: source.relevanceScore,
                updateFrequency: source.updateFrequency,
            });
        }
    }
    return map;
}
