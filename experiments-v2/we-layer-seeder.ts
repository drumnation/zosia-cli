/**
 * We-Layer Seeder for Zosia Experiments v2
 *
 * Seeds the Graphiti knowledge graph with context about the human.
 * This is the "collective memory" that the We-layer draws from.
 *
 * The We-layer is:
 * - Semantic memory queryable by relevance
 * - Temporal (knows when things happened)
 * - Rich with relationships between entities
 * - The foundation that enables depth in responses
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface Episode {
  name: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface EpisodeFile {
  groupId: string;
  episodes: Episode[];
}

export interface SeederConfig {
  /** Base path to dave-context (auto-detected if not provided) */
  basePath?: string;
  /** Graphiti API URL */
  graphitiUrl?: string;
  /** Default group ID for seeding */
  defaultGroupId?: string;
  /** Debug mode */
  debug?: boolean;
}

export interface SeedResult {
  success: boolean;
  episodesSeeded: number;
  errors: string[];
  groupId: string;
}

export interface RetrievalTestResult {
  query: string;
  factsFound: number;
  nodesFound: number;
  relevantFacts: Array<{
    fact: string;
    confidence?: number;
  }>;
  relevantNodes: Array<{
    name: string;
    type?: string;
  }>;
  latencyMs: number;
}

// ============================================================================
// Default Paths
// ============================================================================

const DEFAULT_DAVE_CONTEXT_PATHS = [
  '/Users/dmieloch/Dev/projects/mieloch-manager-pro/dave-context',
  join(process.env.HOME || '', 'Dev/projects/mieloch-manager-pro/dave-context'),
];

const EPISODE_FILES = [
  'memories/batch-inserts/career-facts-episodes.json',
];

const MARKDOWN_CONTEXT_PATH = 'progressive-disclosure/level-2-detail';

// ============================================================================
// We-Layer Seeder Class
// ============================================================================

export class WeLayerSeeder {
  private basePath: string;
  private graphitiUrl: string;
  private defaultGroupId: string;
  private debug: boolean;

  constructor(config: SeederConfig = {}) {
    this.basePath = config.basePath || this.detectBasePath();
    this.graphitiUrl = config.graphitiUrl || 'http://localhost:8000';
    this.defaultGroupId = config.defaultGroupId || 'zosia-dmieloch';
    this.debug = config.debug ?? false;

    if (this.debug) {
      console.log(`[WeLayerSeeder] Base path: ${this.basePath}`);
      console.log(`[WeLayerSeeder] Graphiti URL: ${this.graphitiUrl}`);
      console.log(`[WeLayerSeeder] Default group: ${this.defaultGroupId}`);
    }
  }

  private detectBasePath(): string {
    for (const path of DEFAULT_DAVE_CONTEXT_PATHS) {
      if (existsSync(path)) {
        return path;
      }
    }
    throw new Error(
      `dave-context not found. Tried:\n${DEFAULT_DAVE_CONTEXT_PATHS.join('\n')}`
    );
  }

  /**
   * Load episodes from a JSON file
   */
  loadEpisodeFile(relativePath: string): EpisodeFile | null {
    const fullPath = join(this.basePath, relativePath);
    if (!existsSync(fullPath)) {
      if (this.debug) {
        console.log(`[WeLayerSeeder] Episode file not found: ${fullPath}`);
      }
      return null;
    }

    const content = readFileSync(fullPath, 'utf-8');
    return JSON.parse(content) as EpisodeFile;
  }

  /**
   * Convert markdown files to episodes
   */
  loadMarkdownAsEpisodes(groupId?: string): Episode[] {
    const mdPath = join(this.basePath, MARKDOWN_CONTEXT_PATH);
    if (!existsSync(mdPath)) {
      return [];
    }

    const files = readdirSync(mdPath).filter((f) => f.endsWith('.md'));
    const episodes: Episode[] = [];

    for (const file of files) {
      const filePath = join(mdPath, file);
      const content = readFileSync(filePath, 'utf-8');
      const name = file.replace('.md', '').replace(/-/g, ' ');

      episodes.push({
        name: `Context: ${name}`,
        content: content,
        metadata: {
          source: 'dave-context',
          file: file,
          type: 'level-2-detail',
        },
      });
    }

    if (this.debug) {
      console.log(`[WeLayerSeeder] Loaded ${episodes.length} markdown episodes`);
    }

    return episodes;
  }

  /**
   * Seed episodes to Graphiti via MCP or direct API
   * Note: This returns the episodes - actual seeding happens via MCP tool calls
   */
  async prepareEpisodesForSeeding(options: {
    includeJsonEpisodes?: boolean;
    includeMarkdown?: boolean;
    groupId?: string;
  } = {}): Promise<{
    groupId: string;
    episodes: Episode[];
  }> {
    const {
      includeJsonEpisodes = true,
      includeMarkdown = true,
      groupId = this.defaultGroupId,
    } = options;

    const allEpisodes: Episode[] = [];

    // Load JSON episode files
    if (includeJsonEpisodes) {
      for (const filePath of EPISODE_FILES) {
        const episodeFile = this.loadEpisodeFile(filePath);
        if (episodeFile) {
          allEpisodes.push(...episodeFile.episodes);
          if (this.debug) {
            console.log(
              `[WeLayerSeeder] Loaded ${episodeFile.episodes.length} episodes from ${filePath}`
            );
          }
        }
      }
    }

    // Load markdown files as episodes
    if (includeMarkdown) {
      const mdEpisodes = this.loadMarkdownAsEpisodes(groupId);
      allEpisodes.push(...mdEpisodes);
    }

    return {
      groupId,
      episodes: allEpisodes,
    };
  }

  /**
   * Generate Graphiti add_memory calls for each episode
   * Returns the commands that should be executed
   */
  generateSeedingCommands(episodes: Episode[], groupId: string): Array<{
    name: string;
    content: string;
    groupId: string;
    source: string;
    sourceDescription: string;
  }> {
    return episodes.map((ep) => ({
      name: ep.name,
      content: ep.content,
      groupId: groupId,
      source: 'text',
      sourceDescription: `dave-context: ${ep.metadata?.type || 'general'}`,
    }));
  }

  /**
   * Test retrieval quality by running queries
   * Note: Actual retrieval happens via MCP tools
   */
  generateRetrievalQueries(): Array<{
    query: string;
    expectedTopics: string[];
    description: string;
  }> {
    return [
      {
        query: 'custody schedule constraints remote work',
        expectedTopics: ['50/50 custody', 'remote work requirement', 'children'],
        description: 'Should retrieve custody and work constraints',
      },
      {
        query: 'leadership experience team management mentorship',
        expectedTopics: ['Scala', 'DrayNow', 'team lead', 'mentorship'],
        description: 'Should retrieve leadership roles and achievements',
      },
      {
        query: 'technical skills TypeScript React',
        expectedTopics: ['TypeScript origin', 'Brain Garden', 'React Native'],
        description: 'Should retrieve technical background',
      },
      {
        query: 'career gaps weaknesses acknowledged',
        expectedTopics: ['no CS degree', 'age', 'no FAANG', 'solo work'],
        description: 'Should retrieve acknowledged gaps',
      },
      {
        query: 'music drums hobbies interests',
        expectedTopics: ['music degree', 'drums', 'percussion', 'jazz'],
        description: 'Should retrieve personal interests',
      },
      {
        query: 'fitness health weight room exercise',
        expectedTopics: ['weight room', 'one year challenge', 'losing weight'],
        description: 'Should retrieve fitness context',
      },
      {
        query: 'friends relationships social dad',
        expectedTopics: ['Zubair', 'Ben', 'JP', 'dad', 'cultivate relationships'],
        description: 'Should retrieve social/relationship goals',
      },
    ];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createWeLayerSeeder(config: SeederConfig = {}): WeLayerSeeder {
  return new WeLayerSeeder(config);
}

// ============================================================================
// Quick Test (run with: npx tsx experiments-v2/we-layer-seeder.ts)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== We-Layer Seeder Test ===\n');

  const seeder = createWeLayerSeeder({ debug: true });

  // Prepare episodes
  const { groupId, episodes } = await seeder.prepareEpisodesForSeeding({
    includeJsonEpisodes: true,
    includeMarkdown: true,
  });

  console.log(`\n--- Episodes Ready for Seeding ---`);
  console.log(`Group ID: ${groupId}`);
  console.log(`Total episodes: ${episodes.length}`);
  console.log(`\nEpisode names:`);
  for (const ep of episodes) {
    const preview = ep.content.slice(0, 60).replace(/\n/g, ' ');
    console.log(`  - ${ep.name}: "${preview}..."`);
  }

  console.log(`\n--- Retrieval Test Queries ---`);
  const queries = seeder.generateRetrievalQueries();
  for (const q of queries) {
    console.log(`  Query: "${q.query}"`);
    console.log(`    Expected: ${q.expectedTopics.join(', ')}`);
    console.log(`    ${q.description}\n`);
  }

  console.log(`\n--- Next Steps ---`);
  console.log(`1. Seed episodes to Graphiti using MCP tools`);
  console.log(`2. Run retrieval queries to verify context is accessible`);
  console.log(`3. Only then run depth tests with retrieved context`);
}
