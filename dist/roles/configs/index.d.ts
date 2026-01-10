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
 * Get all configured role knowledge domains.
 * @returns Array of all role configurations
 */
export declare function getAllRoleConfigs(): RoleKnowledgeDomain[];
/**
 * Get a specific role configuration by ID.
 * @param roleId - The role identifier (e.g., 'engineer', 'father')
 * @returns The role configuration or undefined if not found
 */
export declare function getRoleConfig(roleId: string): RoleKnowledgeDomain | undefined;
/**
 * Get all role IDs.
 * @returns Array of role identifiers
 */
export declare function getAllRoleIds(): string[];
/**
 * Check if a role configuration exists.
 * @param roleId - The role identifier to check
 * @returns true if the role exists
 */
export declare function hasRoleConfig(roleId: string): boolean;
export { engineerRole, fatherRole, musicianRole, divorcedRole, freelancerRole };
//# sourceMappingURL=index.d.ts.map