/**
 * Role Knowledge Domain Schema
 *
 * Defines the structure for anticipatory role intelligence.
 * Each role has configured news sources, research topics, and transition indicators
 * that enable proactive knowledge gathering.
 */

/**
 * Configuration for fetching from a news source.
 * Supports RSS feeds, APIs, and web scraping.
 */
export interface FetchConfig {
  /** Custom HTTP headers for the request */
  headers?: Record<string, string>;
  /** CSS selector for web scraping (type: 'scrape' only) */
  selector?: string;
  /** API key for authenticated endpoints (type: 'api' only) */
  apiKey?: string;
  /** Maximum items to fetch per request */
  maxItems?: number;
}

/**
 * A news or content source for gathering role-relevant knowledge.
 */
export interface NewsSource {
  /** Unique identifier for this source */
  id: string;
  /** Human-readable name */
  name: string;
  /** Type of source determining fetch strategy */
  type: 'rss' | 'api' | 'scrape';
  /** URL to fetch from */
  url: string;
  /** How often this source should be fetched */
  updateFrequency: 'hourly' | 'daily' | 'weekly';
  /** Relevance score (0.0-1.0) - learned over time based on usefulness */
  relevanceScore: number;
  /** Last successful fetch timestamp */
  lastFetched?: Date;
  /** Optional fetch configuration */
  fetchConfig?: FetchConfig;
}

/**
 * A community or forum relevant to a role.
 */
export interface Community {
  /** Community name */
  name: string;
  /** Platform type */
  platform: 'reddit' | 'discord' | 'forum' | 'other';
  /** URL to the community */
  url: string;
  /** Whether to actively monitor this community for insights */
  monitoringEnabled: boolean;
}

/**
 * Complete knowledge domain configuration for a role.
 * Combines detection patterns with knowledge gathering sources.
 */
export interface RoleKnowledgeDomain {
  // === Identity ===

  /** Unique identifier for this role (lowercase, hyphenated) */
  roleId: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of this role in Dave's life */
  description: string;

  // === Detection (extends existing role detection) ===

  /** Keywords that trigger this role detection */
  keywords: string[];
  /** Contextual markers that suggest this role is active */
  contextMarkers: string[];

  // === Knowledge Sources ===

  /** News and content sources for this role */
  newsSources: NewsSource[];
  /** Topics to research for this role */
  researchTopics: string[];
  /** Communities relevant to this role */
  communities: Community[];

  // === Transition Detection ===

  /** Phrases that might indicate role transition or evolution */
  transitionIndicators: string[];
  /** Keywords discovered from conversation patterns (populated by transition detection) */
  emergingKeywords: string[];

  // === Metadata ===

  /** Last time knowledge was fetched for this role */
  knowledgeLastFetched?: Date;
  /** Total number of knowledge episodes stored in Graphiti */
  totalEpisodesStored: number;
  /** Last time knowledge was surfaced in a conversation */
  lastSurfacedAt?: Date;
}

/**
 * Fetched item from any source before processing.
 * Common structure used by all fetchers.
 */
export interface FetchedItem {
  /** Article/item title */
  title: string;
  /** Content snippet or full content */
  content: string;
  /** URL to original source */
  url: string;
  /** Publication date if available */
  pubDate?: Date;
  /** Source ID that this came from */
  source: string;
}

/**
 * Processed knowledge item ready for storage.
 */
export interface ProcessedKnowledge {
  /** Original article title */
  originalTitle: string;
  /** AI-generated summary (2-3 sentences) */
  summary: string;
  /** URL to original source */
  url: string;
  /** Relevance score for this role (0.0-1.0) */
  relevanceScore: number;
  /** Extracted topics */
  topics: string[];
}

/**
 * Knowledge surfaced for a role during conversation.
 */
export interface SurfacedKnowledge {
  /** Role this knowledge belongs to */
  roleId: string;
  /** Insights to present to I-layer */
  insights: Array<{
    /** Summary of the insight */
    summary: string;
    /** Source name */
    source: string;
    /** Relevance score */
    relevance: number;
    /** Human-readable age ("2 hours ago", "yesterday") */
    age: string;
  }>;
}

/**
 * Role knowledge state in the MindState.
 */
export interface RoleKnowledgeState {
  /** Insight summaries for this role */
  insights: string[];
  /** How fresh the knowledge is */
  freshness: 'recent' | 'stale' | 'none';
}
