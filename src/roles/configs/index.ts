/**
 * Role Configuration Registry
 *
 * Central registry for all role knowledge domain configurations.
 * Provides access to individual roles and collection utilities.
 */

import type { RoleKnowledgeDomain } from '../role-knowledge-domain.js';
import { engineerRole } from './engineer.role.js';
import { fatherRole } from './father.role.js';
import { musicianRole } from './musician.role.js';
import { divorcedRole } from './divorced.role.js';
import { freelancerRole } from './freelancer.role.js';

/**
 * All configured roles indexed by roleId.
 */
const roleRegistry: Record<string, RoleKnowledgeDomain> = {
  engineer: engineerRole,
  father: fatherRole,
  musician: musicianRole,
  'divorced-person': divorcedRole,
  freelancer: freelancerRole,
};

/**
 * Get all configured role knowledge domains.
 * @returns Array of all role configurations
 */
export function getAllRoleConfigs(): RoleKnowledgeDomain[] {
  return Object.values(roleRegistry);
}

/**
 * Get a specific role configuration by ID.
 * @param roleId - The role identifier (e.g., 'engineer', 'father')
 * @returns The role configuration or undefined if not found
 */
export function getRoleConfig(roleId: string): RoleKnowledgeDomain | undefined {
  // Normalize roleId (lowercase, handle spaces)
  const normalizedId = roleId.toLowerCase().replace(/\s+/g, '-');
  return roleRegistry[normalizedId];
}

/**
 * Get all role IDs.
 * @returns Array of role identifiers
 */
export function getAllRoleIds(): string[] {
  return Object.keys(roleRegistry);
}

/**
 * Check if a role configuration exists.
 * @param roleId - The role identifier to check
 * @returns true if the role exists
 */
export function hasRoleConfig(roleId: string): boolean {
  const normalizedId = roleId.toLowerCase().replace(/\s+/g, '-');
  return normalizedId in roleRegistry;
}

// Re-export individual roles for direct import if needed
export { engineerRole, fatherRole, musicianRole, divorcedRole, freelancerRole };
