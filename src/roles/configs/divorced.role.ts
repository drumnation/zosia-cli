/**
 * Divorced Person Role Configuration
 *
 * Dave navigating post-divorce financial recovery,
 * co-parenting dynamics, and personal growth.
 */

import type { RoleKnowledgeDomain } from '../role-knowledge-domain.js';

export const divorcedRole: RoleKnowledgeDomain = {
  // === Identity ===
  roleId: 'divorced-person',
  displayName: 'Divorced Person',
  description:
    'Navigating post-divorce life including $115K debt to family, co-parenting with ex-spouse (Jess), managing financial recovery, and processing relationship transitions.',

  // === Detection ===
  keywords: [
    'divorce',
    'divorced',
    'co-parent',
    'custody',
    'settlement',
    '$115k',
    'dad loan',
    'jess',
    'ex',
    'alimony',
    'child support',
    'lawyer',
    'mediation',
  ],
  contextMarkers: [
    'financial pressure',
    'co-parenting',
    'moving forward',
    'healing',
    'starting over',
  ],

  // === Knowledge Sources ===
  newsSources: [
    {
      id: 'divorce-magazine',
      name: 'Divorce Magazine',
      type: 'rss',
      url: 'https://www.divorcemag.com/feed',
      updateFrequency: 'weekly',
      relevanceScore: 0.75,
    },
    {
      id: 'coparenter-blog',
      name: 'coParenter Blog',
      type: 'rss',
      url: 'https://coparenter.com/blog/feed/',
      updateFrequency: 'weekly',
      relevanceScore: 0.8,
    },
    {
      id: 'nerdwallet-debt',
      name: 'NerdWallet Debt',
      type: 'rss',
      url: 'https://www.nerdwallet.com/blog/feed/',
      updateFrequency: 'weekly',
      relevanceScore: 0.65,
    },
  ],

  researchTopics: [
    'debt management and repayment strategies',
    'parallel parenting vs co-parenting',
    'financial recovery after divorce',
    'emotional healing post-divorce timeline',
    'family loan repayment etiquette',
    'rebuilding credit after divorce',
    'establishing new routines as a single person',
    'healthy boundaries with ex-spouse',
  ],

  communities: [
    {
      name: 'Divorce',
      platform: 'reddit',
      url: 'https://reddit.com/r/Divorce',
      monitoringEnabled: true,
    },
    {
      name: 'DivorcedDads',
      platform: 'reddit',
      url: 'https://reddit.com/r/DivorcedDads',
      monitoringEnabled: true,
    },
    {
      name: 'PersonalFinance',
      platform: 'reddit',
      url: 'https://reddit.com/r/personalfinance',
      monitoringEnabled: false,
    },
  ],

  // === Transition Detection ===
  transitionIndicators: [
    'dating',
    'new relationship',
    'moving on',
    'debt free',
    'closure',
    'selling house',
    'refinancing',
    'therapy graduation',
  ],
  emergingKeywords: [],

  // === Metadata ===
  totalEpisodesStored: 0,
};
