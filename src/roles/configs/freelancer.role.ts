/**
 * Freelancer Role Configuration
 *
 * Dave as a side-hustle consultant building towards
 * potential full-time independence.
 */

import type { RoleKnowledgeDomain } from '../role-knowledge-domain.js';

export const freelancerRole: RoleKnowledgeDomain = {
  // === Identity ===
  roleId: 'freelancer',
  displayName: 'Freelancer',
  description:
    'Side-hustle consultant at $250/hr focusing on React/TypeScript architecture, medical supply domain expertise, building AI-native portfolio to potentially go full-time independent.',

  // === Detection ===
  keywords: [
    'freelance',
    'client',
    'rate',
    '$250',
    '$250/hr',
    'consulting',
    'side-hustle',
    'medical supply',
    'contract',
    'invoice',
    'proposal',
    'pipeline',
    'hourly',
  ],
  contextMarkers: [
    'client work',
    'consulting',
    'billing',
    'proposals',
    'networking',
    'portfolio',
  ],

  // === Knowledge Sources ===
  newsSources: [
    {
      id: 'freelancers-union',
      name: 'Freelancers Union Blog',
      type: 'rss',
      url: 'https://blog.freelancersunion.org/feed/',
      updateFrequency: 'weekly',
      relevanceScore: 0.8,
    },
    {
      id: 'toptal-blog',
      name: 'Toptal Engineering Blog',
      type: 'rss',
      url: 'https://www.toptal.com/blog/feed',
      updateFrequency: 'weekly',
      relevanceScore: 0.7,
    },
    {
      id: 'indie-hackers',
      name: 'Indie Hackers',
      type: 'rss',
      url: 'https://www.indiehackers.com/feed.xml',
      updateFrequency: 'daily',
      relevanceScore: 0.75,
    },
  ],

  researchTopics: [
    'freelance rate benchmarking for senior developers',
    'client acquisition strategies for consultants',
    'medical supply industry software trends',
    'transitioning from employment to full-time freelance',
    'LLC vs S-Corp for freelancers',
    'building recurring revenue as a consultant',
    'AI-native portfolio presentation',
    'remote consulting best practices',
  ],

  communities: [
    {
      name: 'Freelance',
      platform: 'reddit',
      url: 'https://reddit.com/r/freelance',
      monitoringEnabled: true,
    },
    {
      name: 'Consulting',
      platform: 'reddit',
      url: 'https://reddit.com/r/consulting',
      monitoringEnabled: false,
    },
    {
      name: 'EntrepreneurRideAlong',
      platform: 'reddit',
      url: 'https://reddit.com/r/EntrepreneurRideAlong',
      monitoringEnabled: true,
    },
  ],

  // === Transition Detection ===
  transitionIndicators: [
    'full-time freelance',
    'quit job',
    'scaling',
    'hiring subcontractors',
    'agency',
    'productizing',
    'passive income',
    'leaving scala',
  ],
  emergingKeywords: [],

  // === Metadata ===
  totalEpisodesStored: 0,
};
