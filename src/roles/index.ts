/**
 * Role Intelligence Module
 *
 * Exports all role-related types, configurations, and utilities
 * for the anticipatory role intelligence system.
 */

// === Type Exports ===
export type {
  FetchConfig,
  NewsSource,
  Community,
  RoleKnowledgeDomain,
  FetchedItem,
  ProcessedKnowledge,
  SurfacedKnowledge,
  RoleKnowledgeState,
} from './role-knowledge-domain.js';

// === Config Exports ===
export {
  getAllRoleConfigs,
  getRoleConfig,
  getAllRoleIds,
  hasRoleConfig,
  engineerRole,
  fatherRole,
  musicianRole,
  divorcedRole,
  freelancerRole,
} from './configs/index.js';

// === Fetcher Exports ===
export { RssFetcher, fetchRss } from './fetchers/rss-fetcher.js';

// === Worker Export ===
export {
  KnowledgeWorker,
  makeKnowledgeWorker,
  DEFAULT_WORKER_CONFIG,
  type WorkerConfig,
  type FetchCallback,
  type ErrorCallback,
} from './knowledge-worker.js';

// === Storage Exports ===
export {
  getRoleGroupId,
  calculateExpiry,
  generateEpisodeName,
  isUrlStored,
  markUrlStored,
  clearStoredUrlsCache,
  storeRoleKnowledge,
  queryRoleKnowledge,
  createStorageCallback,
  buildSourceMap,
  type RoleKnowledgeMetadata,
  type StorageResult,
  type QueriedKnowledge,
} from './role-knowledge-storage.js';

// === Surfacing Exports ===
export {
  surfaceKnowledgeForRoles,
  toRoleKnowledgeState,
  generateRoleIntelligencePrompt,
  surfaceAndGeneratePrompt,
  type DetectedRole,
  type SurfacingOptions,
} from './knowledge-surfacer.js';
