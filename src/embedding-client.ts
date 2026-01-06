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
  embed(options: { texts: string[] }): Promise<{ embeddings: number[][]; provider: string }>;
  getProviderStatuses(): Promise<{
    jina?: { available: boolean };
    openai?: { available: boolean };
  }>;
}

let embeddingService: IEmbeddingService | null = null;

/**
 * Get or create the embedding service
 * Currently returns a stub - server-side embedding is used instead
 */
export function getEmbeddingService(): IEmbeddingService {
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
export async function embedQuery(
  _query: string,
  _options: { debug?: boolean } = {}
): Promise<{ vector: number[]; provider: string; latencyMs: number }> {
  // Server-side embedding will be used instead
  throw new Error('Local embedding not available - server will embed');
}

/**
 * Check if embedding is available (at least one provider works)
 * Returns false since we use server-side embedding
 */
export async function isEmbeddingAvailable(): Promise<boolean> {
  // Always return false to trigger server-side embedding fallback
  return false;
}

/**
 * Reset the embedding service (useful after config changes)
 */
export function resetEmbeddingService(): void {
  embeddingService = null;
}
