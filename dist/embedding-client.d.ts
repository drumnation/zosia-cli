/**
 * Embedding Client for Zosia CLI
 *
 * Stubbed implementation - embedding is handled server-side by Graphiti.
 * This allows the CLI to work without requiring external embedding packages.
 *
 * Future: Could add Jina or OpenAI embedding support if needed.
 */
/**
 * Embedding service interface (stubbed)
 */
export interface IEmbeddingService {
    preferredProvider: string;
    embed(options: {
        texts: string[];
    }): Promise<{
        embeddings: number[][];
        provider: string;
    }>;
    getProviderStatuses(): Promise<{
        jina?: {
            available: boolean;
        };
        openai?: {
            available: boolean;
        };
    }>;
}
/**
 * Get or create the embedding service
 * Currently returns a stub - server-side embedding is used instead
 */
export declare function getEmbeddingService(): IEmbeddingService;
/**
 * Embed a query using the user's configured provider
 * Currently stubbed - Graphiti server handles embedding
 */
export declare function embedQuery(_query: string, _options?: {
    debug?: boolean;
}): Promise<{
    vector: number[];
    provider: string;
    latencyMs: number;
}>;
/**
 * Check if embedding is available (at least one provider works)
 * Returns false since we use server-side embedding
 */
export declare function isEmbeddingAvailable(): Promise<boolean>;
/**
 * Reset the embedding service (useful after config changes)
 */
export declare function resetEmbeddingService(): void;
//# sourceMappingURL=embedding-client.d.ts.map