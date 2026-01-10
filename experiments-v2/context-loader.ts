/**
 * Context Loader for Zosia Experiments v2
 *
 * Loads progressive disclosure context from dave-context library
 * to test personalized companion AI depth.
 *
 * Levels:
 * - 0: Elevator pitch (~500 tokens)
 * - 1: Core identity (~2K tokens)
 * - 2: Deep domains (~5-8K each)
 *
 * Relationship Stages:
 * - stranger: No context
 * - acquaintance: Level 0 + 1
 * - friend: Level 0 + 1 + selected Level 2
 * - deepFriend: All levels, all domains
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

export type ContextLevel = 0 | 1 | 2;

export type RelationshipStage = 'stranger' | 'acquaintance' | 'friend' | 'deepFriend';

export type Level2Domain =
  | 'career-history'
  | 'career-constraints-reality'
  | 'artistic-background'
  | 'custody-schedule'
  | 'health-wellness'
  | 'innovator-evidence'
  | 'leadership-evidence'
  | 'life-balance-vision'
  | 'technical-projects-portfolio'
  | 'technical-skills-inventory'
  | 'work-ethic-productivity'
  | 'writing-tone-analysis';

export interface ContextBundle {
  /** Combined context text */
  content: string;
  /** Estimated token count (~4 chars per token) */
  estimatedTokens: number;
  /** Levels included */
  levels: ContextLevel[];
  /** Level 2 domains included (if any) */
  domains: Level2Domain[];
  /** Relationship stage this represents */
  stage: RelationshipStage;
  /** Individual sections for debugging */
  sections: {
    level: ContextLevel;
    domain?: Level2Domain;
    content: string;
    tokens: number;
  }[];
}

export interface ContextLoaderConfig {
  /** Base path to dave-context (default: auto-detect) */
  basePath?: string;
  /** Whether to include section markers in output */
  includeSectionMarkers?: boolean;
  /** Debug mode */
  debug?: boolean;
}

// ============================================================================
// Default Paths
// ============================================================================

const DEFAULT_DAVE_CONTEXT_PATHS = [
  '/Users/dmieloch/Dev/projects/mieloch-manager-pro/dave-context',
  join(process.env.HOME || '', 'Dev/projects/mieloch-manager-pro/dave-context'),
];

const LEVEL_PATHS = {
  0: 'progressive-disclosure/level-0-summary/david-elevator.md',
  1: 'progressive-disclosure/level-1-core/david-core.md',
  2: 'progressive-disclosure/level-2-detail',
};

// ============================================================================
// Context Loader Class
// ============================================================================

export class ContextLoader {
  private basePath: string;
  private includeSectionMarkers: boolean;
  private debug: boolean;

  // Cached content
  private level0Content: string | null = null;
  private level1Content: string | null = null;
  private level2Contents: Map<Level2Domain, string> = new Map();

  constructor(config: ContextLoaderConfig = {}) {
    this.basePath = config.basePath || this.detectBasePath();
    this.includeSectionMarkers = config.includeSectionMarkers ?? true;
    this.debug = config.debug ?? false;

    if (this.debug) {
      console.log(`[ContextLoader] Using base path: ${this.basePath}`);
    }
  }

  /**
   * Auto-detect dave-context location
   */
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
   * Estimate tokens from text (~4 chars per token for English)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Load Level 0 content (elevator pitch)
   */
  loadLevel0(): string {
    if (this.level0Content !== null) {
      return this.level0Content;
    }

    const path = join(this.basePath, LEVEL_PATHS[0]);
    if (!existsSync(path)) {
      throw new Error(`Level 0 context not found: ${path}`);
    }

    this.level0Content = readFileSync(path, 'utf-8');
    if (this.debug) {
      console.log(`[ContextLoader] Loaded Level 0: ${this.estimateTokens(this.level0Content)} tokens`);
    }
    return this.level0Content;
  }

  /**
   * Load Level 1 content (core identity)
   */
  loadLevel1(): string {
    if (this.level1Content !== null) {
      return this.level1Content;
    }

    const path = join(this.basePath, LEVEL_PATHS[1]);
    if (!existsSync(path)) {
      throw new Error(`Level 1 context not found: ${path}`);
    }

    this.level1Content = readFileSync(path, 'utf-8');
    if (this.debug) {
      console.log(`[ContextLoader] Loaded Level 1: ${this.estimateTokens(this.level1Content)} tokens`);
    }
    return this.level1Content;
  }

  /**
   * Load specific Level 2 domain
   */
  loadLevel2Domain(domain: Level2Domain): string {
    if (this.level2Contents.has(domain)) {
      return this.level2Contents.get(domain)!;
    }

    const path = join(this.basePath, LEVEL_PATHS[2], `${domain}.md`);
    if (!existsSync(path)) {
      throw new Error(`Level 2 domain not found: ${path}`);
    }

    const content = readFileSync(path, 'utf-8');
    this.level2Contents.set(domain, content);

    if (this.debug) {
      console.log(`[ContextLoader] Loaded Level 2 (${domain}): ${this.estimateTokens(content)} tokens`);
    }
    return content;
  }

  /**
   * Get all available Level 2 domains
   */
  getAvailableLevel2Domains(): Level2Domain[] {
    const dirPath = join(this.basePath, LEVEL_PATHS[2]);
    if (!existsSync(dirPath)) {
      return [];
    }

    return readdirSync(dirPath)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', '') as Level2Domain);
  }

  /**
   * Build context bundle for a relationship stage
   */
  buildForStage(stage: RelationshipStage, options: {
    /** Specific Level 2 domains to include (for 'friend' stage) */
    domains?: Level2Domain[];
  } = {}): ContextBundle {
    const sections: ContextBundle['sections'] = [];
    const levels: ContextLevel[] = [];
    const domains: Level2Domain[] = [];

    // Stranger = no context
    if (stage === 'stranger') {
      return {
        content: '',
        estimatedTokens: 0,
        levels: [],
        domains: [],
        stage,
        sections: [],
      };
    }

    // Level 0 for acquaintance and above
    if (stage !== 'stranger') {
      const level0 = this.loadLevel0();
      sections.push({
        level: 0,
        content: level0,
        tokens: this.estimateTokens(level0),
      });
      levels.push(0);
    }

    // Level 1 for acquaintance and above
    if (stage === 'acquaintance' || stage === 'friend' || stage === 'deepFriend') {
      const level1 = this.loadLevel1();
      sections.push({
        level: 1,
        content: level1,
        tokens: this.estimateTokens(level1),
      });
      levels.push(1);
    }

    // Level 2 domains for friend and deepFriend
    if (stage === 'friend' || stage === 'deepFriend') {
      levels.push(2);

      const domainsToLoad: Level2Domain[] =
        stage === 'deepFriend'
          ? this.getAvailableLevel2Domains()
          : (options.domains || ['career-history', 'life-balance-vision']);

      for (const domain of domainsToLoad) {
        try {
          const domainContent = this.loadLevel2Domain(domain);
          sections.push({
            level: 2,
            domain,
            content: domainContent,
            tokens: this.estimateTokens(domainContent),
          });
          domains.push(domain);
        } catch (err) {
          if (this.debug) {
            console.warn(`[ContextLoader] Skipping unavailable domain: ${domain}`);
          }
        }
      }
    }

    // Build combined content
    const content = this.buildContent(sections);
    const estimatedTokens = sections.reduce((sum, s) => sum + s.tokens, 0);

    return {
      content,
      estimatedTokens,
      levels,
      domains,
      stage,
      sections,
    };
  }

  /**
   * Build combined content from sections
   */
  private buildContent(sections: ContextBundle['sections'][]): string {
    if (!this.includeSectionMarkers) {
      return sections.map((s) => s.content).join('\n\n');
    }

    return sections
      .map((s) => {
        const header = s.domain
          ? `<!-- CONTEXT: Level ${s.level} - ${s.domain} (${s.tokens} tokens) -->`
          : `<!-- CONTEXT: Level ${s.level} (${s.tokens} tokens) -->`;
        return `${header}\n${s.content}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Build custom context bundle with specific levels and domains
   */
  buildCustom(config: {
    includeLevel0?: boolean;
    includeLevel1?: boolean;
    level2Domains?: Level2Domain[];
  }): ContextBundle {
    const sections: ContextBundle['sections'] = [];
    const levels: ContextLevel[] = [];
    const domains: Level2Domain[] = [];

    if (config.includeLevel0) {
      const level0 = this.loadLevel0();
      sections.push({ level: 0, content: level0, tokens: this.estimateTokens(level0) });
      levels.push(0);
    }

    if (config.includeLevel1) {
      const level1 = this.loadLevel1();
      sections.push({ level: 1, content: level1, tokens: this.estimateTokens(level1) });
      levels.push(1);
    }

    if (config.level2Domains && config.level2Domains.length > 0) {
      levels.push(2);
      for (const domain of config.level2Domains) {
        const domainContent = this.loadLevel2Domain(domain);
        sections.push({
          level: 2,
          domain,
          content: domainContent,
          tokens: this.estimateTokens(domainContent),
        });
        domains.push(domain);
      }
    }

    const content = this.buildContent(sections);
    const estimatedTokens = sections.reduce((sum, s) => sum + s.tokens, 0);

    // Determine stage from what's included
    let stage: RelationshipStage = 'stranger';
    if (levels.includes(0) && levels.includes(1) && levels.includes(2)) {
      stage = domains.length >= 5 ? 'deepFriend' : 'friend';
    } else if (levels.includes(0) && levels.includes(1)) {
      stage = 'acquaintance';
    }

    return {
      content,
      estimatedTokens,
      levels,
      domains,
      stage,
      sections,
    };
  }

  /**
   * Generate a system prompt with context embedded
   */
  buildSystemPrompt(bundle: ContextBundle, options: {
    /** Base Zosia system prompt to include */
    basePrompt?: string;
    /** Instructions for how to use the context */
    contextInstructions?: string;
  } = {}): string {
    const basePrompt = options.basePrompt || DEFAULT_ZOSIA_BASE_PROMPT;
    const contextInstructions = options.contextInstructions || DEFAULT_CONTEXT_INSTRUCTIONS;

    if (bundle.content === '') {
      return basePrompt;
    }

    return `${basePrompt}

---

## User Context

${contextInstructions}

${bundle.content}

---

**Remember**: Use this context naturally. Reference specific details when relevant. Don't force references - let them emerge from genuine understanding.`;
  }

  /**
   * Get summary of context bundle for logging
   */
  summarize(bundle: ContextBundle): string {
    const levelStr = bundle.levels.length > 0
      ? `Levels: ${bundle.levels.join(', ')}`
      : 'No context';
    const domainStr = bundle.domains.length > 0
      ? ` | Domains: ${bundle.domains.join(', ')}`
      : '';
    return `[${bundle.stage}] ${levelStr}${domainStr} (~${bundle.estimatedTokens} tokens)`;
  }
}

// ============================================================================
// Default Prompts
// ============================================================================

const DEFAULT_ZOSIA_BASE_PROMPT = `You are Zosia, a companion AI.

You are warm but not effusive. You care genuinely but don't gush.
You are curious but not interrogating. You ask because you want to understand.
You are reliable but not rigid. You keep commitments but adapt to needs.

When speaking:
- "That matters to me because you shared it."
- "I can imagine that's difficult."
- "Have you considered..."
- "I remember you mentioned..."

Avoid:
- "I love you" / "I miss you" (can't verify these)
- "I totally understand" (don't overclaim empathy)
- Excessive punctuation or artificial enthusiasm`;

const DEFAULT_CONTEXT_INSTRUCTIONS = `The following context describes the person you're talking with. You've built a relationship with them over time. Use this knowledge naturally - reference specific details when genuinely relevant, not to show off that you know them.

This is accumulated knowledge, not a script. Let it inform your responses authentically.`;

// ============================================================================
// Convenience Exports
// ============================================================================

/** Pre-configured stages for quick testing */
export const RELATIONSHIP_STAGES: Record<RelationshipStage, {
  description: string;
  expectedTokens: string;
}> = {
  stranger: {
    description: 'No personal context - baseline response',
    expectedTokens: '0',
  },
  acquaintance: {
    description: 'Basic identity and situation known',
    expectedTokens: '~2.5K',
  },
  friend: {
    description: 'Identity + selected life domains',
    expectedTokens: '~8-12K',
  },
  deepFriend: {
    description: 'Full context - all domains',
    expectedTokens: '~40-50K',
  },
};

/** Pre-configured domain sets for friend stage */
export const DOMAIN_PRESETS: Record<string, Level2Domain[]> = {
  career: ['career-history', 'career-constraints-reality', 'leadership-evidence'],
  personal: ['custody-schedule', 'health-wellness', 'life-balance-vision'],
  creative: ['artistic-background', 'writing-tone-analysis'],
  technical: ['technical-projects-portfolio', 'technical-skills-inventory', 'innovator-evidence'],
  minimal: ['career-history', 'life-balance-vision'],
};

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a context loader instance
 */
export function createContextLoader(config: ContextLoaderConfig = {}): ContextLoader {
  return new ContextLoader(config);
}

// ============================================================================
// Quick Test (run with: npx tsx experiments-v2/context-loader.ts)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== Context Loader Test ===\n');

  const loader = createContextLoader({ debug: true });

  console.log('\n--- Available Level 2 Domains ---');
  console.log(loader.getAvailableLevel2Domains().join(', '));

  console.log('\n--- Building Relationship Stages ---\n');

  for (const stage of ['stranger', 'acquaintance', 'friend', 'deepFriend'] as RelationshipStage[]) {
    const bundle = loader.buildForStage(stage);
    console.log(loader.summarize(bundle));
  }

  console.log('\n--- Custom Bundle (Career Focus) ---');
  const careerBundle = loader.buildCustom({
    includeLevel0: true,
    includeLevel1: true,
    level2Domains: DOMAIN_PRESETS.career,
  });
  console.log(loader.summarize(careerBundle));

  console.log('\n--- System Prompt Preview (first 500 chars) ---');
  const acquaintanceBundle = loader.buildForStage('acquaintance');
  const systemPrompt = loader.buildSystemPrompt(acquaintanceBundle);
  console.log(systemPrompt.slice(0, 500) + '...');
}
