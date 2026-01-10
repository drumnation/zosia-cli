/**
 * Role Intelligence Module
 *
 * Exports all role-related types, configurations, and utilities
 * for the anticipatory role intelligence system.
 */
// === Config Exports ===
export { getAllRoleConfigs, getRoleConfig, getAllRoleIds, hasRoleConfig, engineerRole, fatherRole, musicianRole, divorcedRole, freelancerRole, } from './configs/index.js';
// === Fetcher Exports ===
export { RssFetcher, fetchRss } from './fetchers/rss-fetcher.js';
// === Worker Export ===
export { KnowledgeWorker, makeKnowledgeWorker, DEFAULT_WORKER_CONFIG, } from './knowledge-worker.js';
// === Storage Exports ===
export { getRoleGroupId, calculateExpiry, generateEpisodeName, isUrlStored, markUrlStored, clearStoredUrlsCache, storeRoleKnowledge, queryRoleKnowledge, createStorageCallback, buildSourceMap, } from './role-knowledge-storage.js';
// === Surfacing Exports ===
export { surfaceKnowledgeForRoles, toRoleKnowledgeState, generateRoleIntelligencePrompt, surfaceAndGeneratePrompt, } from './knowledge-surfacer.js';
