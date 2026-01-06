/**
 * Onboarding Module Tests - TDD
 *
 * Tests for the onboarding status checker and configuration helpers.
 * Checks setup status for OpenRouter, Claude Code, Graphiti memory, model, and user identity.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  checkNodeVersion,
  checkOpenRouterKey,
  checkModel,
  checkUserIdentity,
  getOnboardingStatus,
  formatOnboardingStatus,
  setOpenRouterKeyFromInput,
  setModelFromInput,
  getRecommendedModels,
  type SetupItem,
  type OnboardingStatus,
} from '../src/onboarding.js';

// Mock the config module
vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(() => ({
    openrouterKeyValid: false,
    consciousMind: { model: undefined },
  })),
  getOpenRouterKey: vi.fn(() => null),
  setOpenRouterKey: vi.fn(() => Promise.resolve(true)),
  setConsciousMindModel: vi.fn(() => Promise.resolve()),
}));

describe('Onboarding Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SetupItem interface', () => {
    it('should have required fields', () => {
      const item: SetupItem = {
        name: 'Test Item',
        status: 'ok',
        message: 'Test message',
      };

      expect(item.name).toBe('Test Item');
      expect(item.status).toBe('ok');
      expect(item.message).toBe('Test message');
    });

    it('should support optional howToFix field', () => {
      const item: SetupItem = {
        name: 'Test Item',
        status: 'missing',
        message: 'Not configured',
        howToFix: 'Run /onboarding setup',
      };

      expect(item.howToFix).toBe('Run /onboarding setup');
    });

    it('should have three status types', () => {
      const statuses: SetupItem['status'][] = ['ok', 'warning', 'missing'];
      expect(statuses).toHaveLength(3);
    });
  });

  describe('checkNodeVersion()', () => {
    it('should return a SetupItem', () => {
      const result = checkNodeVersion();

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result.name).toBe('Node.js');
    });

    it('should return ok for Node 18+', () => {
      // Since we're running on Node 18+, this should pass
      const result = checkNodeVersion();
      const major = parseInt(process.version.slice(1).split('.')[0], 10);

      if (major >= 18) {
        expect(result.status).toBe('ok');
      }
    });

    it('should include version in message', () => {
      const result = checkNodeVersion();

      expect(result.message).toContain(process.version);
    });
  });

  describe('checkOpenRouterKey()', () => {
    it('should return a SetupItem', () => {
      const result = checkOpenRouterKey();

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result.name).toBe('OpenRouter API Key');
    });

    it('should return missing status when no key configured', () => {
      const result = checkOpenRouterKey();

      expect(result.status).toBe('missing');
      expect(result.howToFix).toBeTruthy();
    });
  });

  describe('checkModel()', () => {
    it('should return a SetupItem', () => {
      const result = checkModel();

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result.name).toBe('Model');
    });
  });

  describe('checkUserIdentity()', () => {
    it('should return a SetupItem', () => {
      const result = checkUserIdentity();

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result.name).toBe('User Identity');
    });
  });

  describe('getOnboardingStatus()', () => {
    it('should return OnboardingStatus with items array', async () => {
      const status = await getOnboardingStatus();

      expect(status).toHaveProperty('items');
      expect(status).toHaveProperty('overallReady');
      expect(status).toHaveProperty('readyCount');
      expect(status).toHaveProperty('totalCount');
      expect(Array.isArray(status.items)).toBe(true);
    });

    it('should check at least 6 items', async () => {
      const status = await getOnboardingStatus();

      expect(status.totalCount).toBeGreaterThanOrEqual(6);
      expect(status.items.length).toBe(status.totalCount);
    });

    it('should calculate readyCount correctly', async () => {
      const status = await getOnboardingStatus();

      const okCount = status.items.filter((i) => i.status === 'ok').length;
      expect(status.readyCount).toBe(okCount);
    });

    it('should set overallReady based on minimum requirements', async () => {
      const status = await getOnboardingStatus();

      // overallReady should be true if at least 3 items are ok
      if (status.readyCount >= 3) {
        expect(status.overallReady).toBe(true);
      } else {
        expect(status.overallReady).toBe(false);
      }
    });
  });

  describe('formatOnboardingStatus()', () => {
    it('should return a formatted string', () => {
      const status: OnboardingStatus = {
        items: [
          { name: 'Test', status: 'ok', message: 'All good' },
        ],
        overallReady: true,
        readyCount: 1,
        totalCount: 1,
      };

      const formatted = formatOnboardingStatus(status);

      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should include header', () => {
      const status: OnboardingStatus = {
        items: [],
        overallReady: false,
        readyCount: 0,
        totalCount: 0,
      };

      const formatted = formatOnboardingStatus(status);

      expect(formatted).toContain('ZOSIA');
      expect(formatted).toContain('SETUP');
    });

    it('should include progress bar', () => {
      const status: OnboardingStatus = {
        items: [
          { name: 'Test1', status: 'ok', message: 'Good' },
          { name: 'Test2', status: 'missing', message: 'Missing' },
        ],
        overallReady: false,
        readyCount: 1,
        totalCount: 2,
      };

      const formatted = formatOnboardingStatus(status);

      expect(formatted).toContain('█');
      expect(formatted).toContain('░');
      expect(formatted).toContain('50%');
    });

    it('should show checkmark for ok items', () => {
      const status: OnboardingStatus = {
        items: [
          { name: 'Test', status: 'ok', message: 'Configured' },
        ],
        overallReady: true,
        readyCount: 1,
        totalCount: 1,
      };

      const formatted = formatOnboardingStatus(status);

      expect(formatted).toContain('✓');
    });

    it('should show warning symbol for warning items', () => {
      const status: OnboardingStatus = {
        items: [
          { name: 'Test', status: 'warning', message: 'Partial' },
        ],
        overallReady: false,
        readyCount: 0,
        totalCount: 1,
      };

      const formatted = formatOnboardingStatus(status);

      expect(formatted).toContain('⚠');
    });

    it('should show X for missing items', () => {
      const status: OnboardingStatus = {
        items: [
          { name: 'Test', status: 'missing', message: 'Not set' },
        ],
        overallReady: false,
        readyCount: 0,
        totalCount: 1,
      };

      const formatted = formatOnboardingStatus(status);

      expect(formatted).toContain('✗');
    });

    it('should show howToFix when available', () => {
      const status: OnboardingStatus = {
        items: [
          { name: 'Test', status: 'missing', message: 'Not set', howToFix: 'Run /setup' },
        ],
        overallReady: false,
        readyCount: 0,
        totalCount: 1,
      };

      const formatted = formatOnboardingStatus(status);

      expect(formatted).toContain('Run /setup');
    });

    it('should show ready message when overall ready', () => {
      const status: OnboardingStatus = {
        items: [
          { name: 'Test', status: 'ok', message: 'Good' },
        ],
        overallReady: true,
        readyCount: 1,
        totalCount: 1,
      };

      const formatted = formatOnboardingStatus(status);

      expect(formatted).toContain('ready');
    });
  });

  describe('setOpenRouterKeyFromInput()', () => {
    it('should reject empty key', async () => {
      const result = await setOpenRouterKeyFromInput('');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No key');
    });

    it('should reject invalid key format', async () => {
      const result = await setOpenRouterKeyFromInput('invalid-key-format');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
      expect(result.message).toContain('sk-or-');
    });

    it('should accept valid key format', async () => {
      const result = await setOpenRouterKeyFromInput('sk-or-v1-test123456789');

      expect(result.success).toBe(true);
      expect(result.message).toContain('saved');
    });
  });

  describe('setModelFromInput()', () => {
    it('should show model list when no model provided', async () => {
      const result = await setModelFromInput('');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Available models');
    });

    it('should accept valid model id', async () => {
      const result = await setModelFromInput('anthropic/claude-3.5-sonnet');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Model set');
    });
  });

  describe('getRecommendedModels()', () => {
    it('should return array of models', () => {
      const models = getRecommendedModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should have id, name, and cost for each model', () => {
      const models = getRecommendedModels();

      for (const model of models) {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('cost');
        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(typeof model.cost).toBe('string');
      }
    });

    it('should include free models', () => {
      const models = getRecommendedModels();
      const freeModels = models.filter((m) => m.cost.toLowerCase() === 'free');

      expect(freeModels.length).toBeGreaterThan(0);
    });

    it('should include Claude models', () => {
      const models = getRecommendedModels();
      const claudeModels = models.filter((m) => m.id.includes('claude'));

      expect(claudeModels.length).toBeGreaterThan(0);
    });
  });
});
