/**
 * Knowledge Surfacer
 *
 * Surfaces role-relevant knowledge from Graphiti when roles are detected.
 * Integrates with the experience synthesizer to enrich the I-layer context.
 */

import type { SurfacedKnowledge, RoleKnowledgeState } from './role-knowledge-domain.js';
import { getRoleGroupId } from './role-knowledge-storage.js';

// Graphiti API configuration
const GRAPHITI_URL = process.env.GRAPHITI_URL || 'http://91.99.27.146:8000';

/** Default confidence threshold for surfacing */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

/** Default max insights per role */
const DEFAULT_MAX_INSIGHTS = 5;

/** Freshness thresholds in milliseconds */
const FRESHNESS_THRESHOLDS = {
  recent: 24 * 60 * 60 * 1000,  // 24 hours
  stale: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

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

/** Result of a single role's knowledge surfacing */
interface RoleSurfacingResult {
  roleId: string;
  insights: Array<{
    summary: string;
    source: string;
    relevance: number;
    createdAt: Date;
  }>;
  freshness: 'recent' | 'stale' | 'none';
}

/**
 * Calculate human-readable age string from a date.
 */
function calculateAge(date: Date): string {
  const now = Date.now();
  const ageMs = now - date.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageDays = ageHours / 24;

  if (ageHours < 1) {
    return 'just now';
  } else if (ageHours < 2) {
    return '1 hour ago';
  } else if (ageHours < 24) {
    return `${Math.floor(ageHours)} hours ago`;
  } else if (ageDays < 2) {
    return 'yesterday';
  } else if (ageDays < 7) {
    return `${Math.floor(ageDays)} days ago`;
  } else if (ageDays < 14) {
    return 'last week';
  } else {
    return `${Math.floor(ageDays / 7)} weeks ago`;
  }
}

/**
 * Calculate freshness level from a list of insight dates.
 */
function calculateFreshness(dates: Date[]): 'recent' | 'stale' | 'none' {
  if (dates.length === 0) {
    return 'none';
  }

  const now = Date.now();
  const hasRecent = dates.some(
    (date) => now - date.getTime() < FRESHNESS_THRESHOLDS.recent
  );

  if (hasRecent) {
    return 'recent';
  }

  const hasStale = dates.some(
    (date) => now - date.getTime() < FRESHNESS_THRESHOLDS.stale
  );

  if (hasStale) {
    return 'stale';
  }

  return 'none';
}

/**
 * Query Graphiti for a single role's knowledge.
 */
async function surfaceRoleKnowledge(
  roleId: string,
  options: { maxFacts?: number; query?: string } = {}
): Promise<RoleSurfacingResult> {
  const groupId = getRoleGroupId(roleId);
  const { maxFacts = DEFAULT_MAX_INSIGHTS, query } = options;

  try {
    // Use search endpoint if query provided, otherwise get recent facts
    const endpoint = query ? '/search' : '/facts';
    const body = query
      ? {
          query,
          group_ids: [groupId],
          max_facts: maxFacts,
        }
      : {
          group_ids: [groupId],
          max_facts: maxFacts,
        };

    const response = await fetch(`${GRAPHITI_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000), // 5 second timeout for responsiveness
    });

    if (!response.ok) {
      console.log(`[KnowledgeSurfacer] No knowledge found for role ${roleId}`);
      return {
        roleId,
        insights: [],
        freshness: 'none',
      };
    }

    const data = await response.json() as {
      facts?: Array<{
        uuid: string;
        fact: string;
        created_at: string;
        source_description?: string;
      }>;
    };

    const facts = data.facts || [];

    if (facts.length === 0) {
      return {
        roleId,
        insights: [],
        freshness: 'none',
      };
    }

    // Transform facts to insights
    const insights = facts.map((fact) => ({
      summary: fact.fact,
      source: fact.source_description || 'unknown',
      relevance: 0.8, // Default relevance, could be enhanced with scoring
      createdAt: new Date(fact.created_at),
    }));

    // Calculate freshness from insight dates
    const dates = insights.map((i) => i.createdAt);
    const freshness = calculateFreshness(dates);

    return {
      roleId,
      insights,
      freshness,
    };
  } catch (error) {
    console.log(`[KnowledgeSurfacer] Error surfacing knowledge for ${roleId}:`, error);
    return {
      roleId,
      insights: [],
      freshness: 'none',
    };
  }
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
export async function surfaceKnowledgeForRoles(
  detectedRoles: DetectedRole[],
  options: SurfacingOptions = {}
): Promise<SurfacedKnowledge[]> {
  const {
    confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
    maxInsightsPerRole = DEFAULT_MAX_INSIGHTS,
    query,
  } = options;

  // Filter roles by confidence threshold
  const qualifyingRoles = detectedRoles.filter(
    (role) => role.confidence >= confidenceThreshold
  );

  if (qualifyingRoles.length === 0) {
    return [];
  }

  console.log(
    `[KnowledgeSurfacer] Surfacing knowledge for ${qualifyingRoles.length} roles: ${qualifyingRoles.map((r) => r.roleId).join(', ')}`
  );

  // Query all roles in parallel for speed
  const surfacingPromises = qualifyingRoles.map((role) =>
    surfaceRoleKnowledge(role.roleId, {
      maxFacts: maxInsightsPerRole,
      query,
    })
  );

  const results = await Promise.all(surfacingPromises);

  // Transform to SurfacedKnowledge format
  return results.map((result) => ({
    roleId: result.roleId,
    insights: result.insights.map((insight) => ({
      summary: insight.summary,
      source: insight.source,
      relevance: insight.relevance,
      age: calculateAge(insight.createdAt),
    })),
  }));
}

/**
 * Convert SurfacedKnowledge to RoleKnowledgeState for MindState integration.
 *
 * This produces the structure expected by the experience bridge prompt.
 *
 * @param surfacedKnowledge - Array of surfaced knowledge
 * @returns Map of roleId to RoleKnowledgeState
 */
export function toRoleKnowledgeState(
  surfacedKnowledge: SurfacedKnowledge[]
): Record<string, RoleKnowledgeState> {
  const result: Record<string, RoleKnowledgeState> = {};

  for (const knowledge of surfacedKnowledge) {
    // Extract just the summaries for the insights array
    const insights = knowledge.insights.map((i) => i.summary);

    // Calculate freshness from the ages
    // Parse age strings to determine freshness
    const freshness = calculateFreshnessFromAges(knowledge.insights.map((i) => i.age));

    result[knowledge.roleId] = {
      insights,
      freshness,
    };
  }

  return result;
}

/**
 * Parse age strings to calculate freshness.
 */
function calculateFreshnessFromAges(ages: string[]): 'recent' | 'stale' | 'none' {
  if (ages.length === 0) {
    return 'none';
  }

  // Check for recent (less than 24h)
  const recentIndicators = ['just now', 'hour ago', 'hours ago'];
  const hasRecent = ages.some((age) =>
    recentIndicators.some((indicator) => age.includes(indicator))
  );

  if (hasRecent) {
    return 'recent';
  }

  // Check for stale (less than 7 days)
  const staleIndicators = ['yesterday', 'days ago', 'week'];
  const hasStale = ages.some((age) =>
    staleIndicators.some((indicator) => age.includes(indicator))
  );

  if (hasStale) {
    return 'stale';
  }

  return 'none';
}

/**
 * Generate the role intelligence section for the experience bridge prompt.
 *
 * @param roleKnowledge - Role knowledge state from MindState
 * @returns Formatted prompt section string
 */
export function generateRoleIntelligencePrompt(
  roleKnowledge: Record<string, RoleKnowledgeState>
): string {
  const roleIds = Object.keys(roleKnowledge);

  if (roleIds.length === 0) {
    return '';
  }

  const sections: string[] = ['## Current Role Intelligence\n'];

  for (const roleId of roleIds) {
    const state = roleKnowledge[roleId];
    const displayName = roleId.charAt(0).toUpperCase() + roleId.slice(1);

    sections.push(`### ${displayName}`);

    if (state.freshness === 'none' || state.insights.length === 0) {
      sections.push('No recent intelligence gathered.\n');
      continue;
    }

    const freshnessLabel =
      state.freshness === 'recent'
        ? 'fresh'
        : `stale - older than 24 hours`;

    sections.push(`Recent insights (${freshnessLabel}):`);

    for (const insight of state.insights) {
      sections.push(`- "${insight}"`);
    }

    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Full surfacing integration function.
 *
 * Combines surfacing, state conversion, and prompt generation into one call.
 *
 * @param detectedRoles - Detected roles with confidence
 * @param options - Surfacing options
 * @returns Object with roleKnowledge state and prompt section
 */
export async function surfaceAndGeneratePrompt(
  detectedRoles: DetectedRole[],
  options: SurfacingOptions = {}
): Promise<{
  roleKnowledge: Record<string, RoleKnowledgeState>;
  promptSection: string;
}> {
  const surfacedKnowledge = await surfaceKnowledgeForRoles(detectedRoles, options);
  const roleKnowledge = toRoleKnowledgeState(surfacedKnowledge);
  const promptSection = generateRoleIntelligencePrompt(roleKnowledge);

  return {
    roleKnowledge,
    promptSection,
  };
}
