/**
 * Engineer Role Configuration
 *
 * Dave as a software developer building AI-native tools,
 * navigating career pivots, managing monorepo complexity.
 */
export const engineerRole = {
    // === Identity ===
    roleId: 'engineer',
    displayName: 'Engineer',
    description: 'Software developer building AI-native tools (Brain Garden, Zosia), navigating career pivots after 20+ years, managing TypeScript monorepo complexity, working at Scala while exploring freelance opportunities.',
    // === Detection ===
    keywords: [
        'brain garden',
        'monorepo',
        'typescript',
        'code',
        'debug',
        'architecture',
        'ai agent',
        'claude',
        'cursor',
        'commit',
        'deploy',
        'scala',
        'react',
        'node',
        'graphiti',
        'zosia',
        'build',
        'test',
        'refactor',
        'pr',
        'git',
        'vscode',
    ],
    contextMarkers: [
        'building',
        'coding',
        'shipping',
        'debugging',
        'refactoring',
        'deploying',
        'architecting',
    ],
    // === Knowledge Sources ===
    newsSources: [
        {
            id: 'hn-top',
            name: 'Hacker News Top',
            type: 'api',
            url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
            updateFrequency: 'hourly',
            relevanceScore: 0.9,
            fetchConfig: {
                maxItems: 30,
            },
        },
        {
            id: 'devto-ai',
            name: 'Dev.to AI Tag',
            type: 'rss',
            url: 'https://dev.to/feed/tag/ai',
            updateFrequency: 'daily',
            relevanceScore: 0.8,
        },
        {
            id: 'devto-typescript',
            name: 'Dev.to TypeScript',
            type: 'rss',
            url: 'https://dev.to/feed/tag/typescript',
            updateFrequency: 'daily',
            relevanceScore: 0.75,
        },
        {
            id: 'tldr-ai',
            name: 'TLDR AI Newsletter',
            type: 'rss',
            url: 'https://tldr.tech/ai/rss',
            updateFrequency: 'daily',
            relevanceScore: 0.85,
        },
        {
            id: 'changelog',
            name: 'The Changelog',
            type: 'rss',
            url: 'https://changelog.com/feed',
            updateFrequency: 'weekly',
            relevanceScore: 0.7,
        },
    ],
    researchTopics: [
        'agentic AI development patterns',
        'AI psychosis / AI-assisted coding burnout',
        'TypeScript monorepo best practices',
        'career pivots in tech after 40',
        'AI replacing developers discourse',
        'Claude Code and Cursor workflows',
        'knowledge graphs for AI memory',
        'senior engineer job market 2026',
    ],
    communities: [
        {
            name: 'ExperiencedDevs',
            platform: 'reddit',
            url: 'https://reddit.com/r/ExperiencedDevs',
            monitoringEnabled: true,
        },
        {
            name: 'LocalLLaMA',
            platform: 'reddit',
            url: 'https://reddit.com/r/LocalLLaMA',
            monitoringEnabled: true,
        },
        {
            name: 'ClaudeAI',
            platform: 'reddit',
            url: 'https://reddit.com/r/ClaudeAI',
            monitoringEnabled: true,
        },
    ],
    // === Transition Detection ===
    transitionIndicators: [
        'teaching',
        'mentoring',
        'ai taking my job',
        'career change',
        'burnout',
        'consulting',
        'starting a company',
        'going indie',
    ],
    emergingKeywords: [],
    // === Metadata ===
    totalEpisodesStored: 0,
};
