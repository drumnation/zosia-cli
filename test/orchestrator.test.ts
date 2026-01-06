/**
 * Orchestrator E2E Tests
 *
 * Tests the full dual-consciousness flow:
 * We-Layer (context assembly) → I-Layer (response generation)
 *
 * NOTE: These tests require OPENROUTER_API_KEY to be set.
 * They are skipped in CI unless credentials are available.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chat, getSession, clearSession } from '../src/orchestrator.js';
import type { ChatOptions } from '../src/types.js';

// Test user ID for isolation
const TEST_USER = `test-user-${Date.now()}`;

// Check if we have API credentials
const hasApiKey = !!process.env.OPENROUTER_API_KEY;

// Skip e2e tests if no API key (they require real API calls)
const describeE2E = hasApiKey ? describe : describe.skip;

describeE2E('Orchestrator - Dual Consciousness Flow', () => {
  beforeEach(() => {
    // Clear any existing session
    clearSession(TEST_USER);
  });

  afterEach(() => {
    // Cleanup
    clearSession(TEST_USER);
  });

  describe('chat()', () => {
    it('should return a Turn with all required fields', async () => {
      const result = await chat('Hello, how are you?', {
        userId: TEST_USER,
        debug: false,
      });

      // Verify Turn structure
      expect(result).toHaveProperty('turnId');
      expect(result).toHaveProperty('userId', TEST_USER);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('userMessage', 'Hello, how are you?');
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('mindstate');

      // Response should be a non-empty string
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);

      // Mindstate should have required structure
      expect(result.mindstate).toHaveProperty('identityKernel');
      expect(result.mindstate).toHaveProperty('workingMemory');
      expect(result.mindstate).toHaveProperty('associations');
      expect(result.mindstate).toHaveProperty('situationSnapshot');
    }, 30000);

    it('should include debug info when debug=true', async () => {
      const result = await chat('Tell me about yourself', {
        userId: TEST_USER,
        debug: true,
      });

      expect(result.debug).toBeDefined();
      expect(result.debug).toHaveProperty('iLayer');
      expect(result.debug).toHaveProperty('weLayer');
      expect(result.debug).toHaveProperty('contextBrief');
      expect(result.debug).toHaveProperty('mindstateVersion');

      // I-Layer debug info
      expect(result.debug?.iLayer).toHaveProperty('model');
      expect(result.debug?.iLayer).toHaveProperty('latencyMs');
      expect(result.debug?.iLayer?.latencyMs).toBeGreaterThan(0);

      // We-Layer debug info
      expect(result.debug?.weLayer).toHaveProperty('activated', true);
      expect(result.debug?.weLayer).toHaveProperty('latencyMs');

      // Context brief debug info
      expect(result.debug?.contextBrief).toHaveProperty('emotion');
      expect(result.debug?.contextBrief).toHaveProperty('intent');
      expect(result.debug?.contextBrief).toHaveProperty('depth');
    }, 30000);

    it('should maintain session continuity across turns', async () => {
      // First turn
      const turn1 = await chat('My name is Test User', {
        userId: TEST_USER,
        debug: false,
      });

      expect(turn1.mindstate.workingMemory).toBeDefined();

      // Second turn - should have session context
      const turn2 = await chat('Do you remember my name?', {
        userId: TEST_USER,
        debug: true,
      });

      // Check session is being tracked
      const session = getSession(TEST_USER);
      expect(session).toBeDefined();
      expect(session?.turns.length).toBe(2);
      expect(session?.turns[0].userMessage).toBe('My name is Test User');
      expect(session?.turns[1].userMessage).toBe('Do you remember my name?');

      // Mindstate version should increment
      expect(turn2.debug?.mindstateVersion).toBe(2);
    }, 60000);
  });

  describe('Context-First Architecture', () => {
    it('should detect emotion in messages', async () => {
      const result = await chat('I am feeling really sad today', {
        userId: TEST_USER,
        debug: true,
      });

      expect(result.debug?.contextBrief?.emotion).toBe('sad');
    }, 30000);

    it('should detect positive emotion', async () => {
      const result = await chat('I am so excited and happy!', {
        userId: TEST_USER,
        debug: true,
      });

      expect(result.debug?.contextBrief?.emotion).toBe('positive');
    }, 30000);

    it('should classify greeting intent', async () => {
      const result = await chat('Hello there!', {
        userId: TEST_USER,
        debug: true,
      });

      expect(result.debug?.contextBrief?.intent).toBe('greeting');
    }, 30000);

    it('should classify question intent', async () => {
      const result = await chat('What is the meaning of life?', {
        userId: TEST_USER,
        debug: true,
      });

      expect(result.debug?.contextBrief?.intent).toBe('question');
    }, 30000);

    it('should classify request intent', async () => {
      const result = await chat('Can you please help me with something?', {
        userId: TEST_USER,
        debug: true,
      });

      expect(result.debug?.contextBrief?.intent).toBe('request');
    }, 30000);
  });

  describe('Session Management', () => {
    it('should create new session for new user', async () => {
      const newUser = `new-user-${Date.now()}`;

      await chat('First message', { userId: newUser, debug: false });

      const session = getSession(newUser);
      expect(session).toBeDefined();
      expect(session?.turns.length).toBe(1);

      // Cleanup
      clearSession(newUser);
    }, 30000);

    it('should clear session correctly', async () => {
      await chat('Test message', { userId: TEST_USER, debug: false });

      expect(getSession(TEST_USER)).toBeDefined();

      clearSession(TEST_USER);

      expect(getSession(TEST_USER)).toBeUndefined();
    }, 30000);
  });

  describe('Response Quality', () => {
    it('should respond in a conversational manner', async () => {
      const result = await chat('Hello!', {
        userId: TEST_USER,
        debug: false,
      });

      // Response should be conversational, not robotic
      const response = result.response.toLowerCase();

      // Should not contain typical AI disclaimers at the start
      expect(response).not.toMatch(/^(as an ai|i am an ai|i don't have)/);

      // Should have some length (not just "Hello")
      expect(result.response.length).toBeGreaterThan(10);
    }, 30000);

    it('should include relevant context in response', async () => {
      // Set up context
      await chat('I love programming in TypeScript', {
        userId: TEST_USER,
        debug: false,
      });

      // Follow-up that could use the context
      const result = await chat('What should I work on today?', {
        userId: TEST_USER,
        debug: true,
      });

      // Should maintain conversation flow
      expect(result.mindstate.workingMemory.lastTopic).toBeDefined();
    }, 60000);
  });
});

describeE2E('Orchestrator Performance', () => {
  it('should complete a turn in reasonable time', async () => {
    const start = Date.now();

    await chat('Quick test message', {
      userId: TEST_USER,
      debug: false,
    });

    const duration = Date.now() - start;

    // Should complete in under 30 seconds (generous for network latency)
    expect(duration).toBeLessThan(30000);
  }, 35000);

  it('should track latency in debug info', async () => {
    const result = await chat('Latency test', {
      userId: TEST_USER,
      debug: true,
    });

    const totalLatency =
      (result.debug?.contextBrief?.processingTimeMs ?? 0) +
      (result.debug?.iLayer?.latencyMs ?? 0);

    expect(totalLatency).toBeGreaterThan(0);
  }, 30000);
});
