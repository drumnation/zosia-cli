/**
 * Knowledge Surfacer
 *
 * Surfaces role-relevant knowledge from Graphiti when roles are detected.
 * Integrates with the experience synthesizer to enrich the I-layer context.
 */
import type { SurfacedKnowledge, RoleKnowledgeState } from './role-knowledge-domain.js';
/** Role detection result from the detection task */
export interface DetectedRole {
    roleId: string;
    confidence: number;
}
/** Options for surfacing knowledge */
export interface SurfacingOptions {
    /** Minimum confidence to surface role knowledge (default: 0.5) */
    confidenceThreshold?: number;
    /** Maximum insights per role (default: 5) */
    maxInsightsPerRole?: number;
    /** Query to search for (if empty, gets recent facts) */
    query?: string;
}
/**
 * Surface knowledge for multiple detected roles.
 *
 * Filters by confidence threshold and queries Graphiti in parallel for efficiency.
 *
 * @param detectedRoles - Roles detected with confidence scores
 * @param options - Surfacing options
 * @returns Array of SurfacedKnowledge for qualifying roles
 */
export declare function surfaceKnowledgeForRoles(detectedRoles: DetectedRole[], options?: SurfacingOptions): Promise<SurfacedKnowledge[]>;
/**
 * Convert SurfacedKnowledge to RoleKnowledgeState for MindState integration.
 *
 * This produces the structure expected by the experience bridge prompt.
 *
 * @param surfacedKnowledge - Array of surfaced knowledge
 * @returns Map of roleId to RoleKnowledgeState
 */
export declare function toRoleKnowledgeState(surfacedKnowledge: SurfacedKnowledge[]): Record<string, RoleKnowledgeState>;
/**
 * Generate the role intelligence section for the experience bridge prompt.
 *
 * @param roleKnowledge - Role knowledge state from MindState
 * @returns Formatted prompt section string
 */
export declare function generateRoleIntelligencePrompt(roleKnowledge: Record<string, RoleKnowledgeState>): string;
/**
 * Full surfacing integration function.
 *
 * Combines surfacing, state conversion, and prompt generation into one call.
 *
 * @param detectedRoles - Detected roles with confidence
 * @param options - Surfacing options
 * @returns Object with roleKnowledge state and prompt section
 */
export declare function surfaceAndGeneratePrompt(detectedRoles: DetectedRole[], options?: SurfacingOptions): Promise<{
    roleKnowledge: Record<string, RoleKnowledgeState>;
    promptSection: string;
}>;
//# sourceMappingURL=knowledge-surfacer.d.ts.map