/**
 * Embedding Client for Zosia CLI
 *
 * Stubbed implementation - embedding is handled server-side by Graphiti.
 * This allows the CLI to work without requiring external embedding packages.
 *
 * Future: Could add Jina or OpenAI embedding support if needed.
 */
let embeddingService = null;
/**
 * Get or create the embedding service
 * Currently returns a stub - server-side embedding is used instead
 */
export function getEmbeddingService() {
    if (embeddingService) {
        return embeddingService;
    }
    // Stub implementation - server handles embedding
    embeddingService = {
        preferredProvider: 'server',
        embed: async () => {
            throw new Error('Local embedding not available - use server-side embedding');
        },
        getProviderStatuses: async () => ({
            jina: { available: false },
            openai: { available: false },
        }),
    };
    return embeddingService;
}
/**
 * Embed a query using the user's configured provider
 * Currently stubbed - Graphiti server handles embedding
 */
export async function embedQuery(_query, _options = {}) {
    // Server-side embedding will be used instead
    throw new Error('Local embedding not available - server will embed');
}
/**
 * Check if embedding is available (at least one provider works)
 * Returns false since we use server-side embedding
 */
export async function isEmbeddingAvailable() {
    // Always return false to trigger server-side embedding fallback
    return false;
}
/**
 * Reset the embedding service (useful after config changes)
 */
export function resetEmbeddingService() {
    embeddingService = null;
}
