/**
 * Input History Tests - TDD
 *
 * Tests for storing and navigating through input history.
 * These tests are written FIRST before implementation (RED phase).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import the module we're going to build
import {
  createHistoryManager,
  type HistoryManager,
} from '../src/history.js';

describe('Input History', () => {
  let testDir: string;
  let historyPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `zosia-history-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    historyPath = join(testDir, 'history.json');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createHistoryManager()', () => {
    it('should create a history manager with empty history', () => {
      const manager = createHistoryManager();

      expect(manager.getHistory()).toHaveLength(0);
      expect(manager.getCurrent()).toBeNull();
    });

    it('should accept maxSize option', () => {
      const manager = createHistoryManager({ maxSize: 5 });

      // Add more than max
      for (let i = 0; i < 10; i++) {
        manager.add(`message ${i}`);
      }

      expect(manager.getHistory()).toHaveLength(5);
    });

    it('should load existing history from file', () => {
      // Create manager with persistence
      const manager1 = createHistoryManager({ persistPath: historyPath });
      manager1.add('first');
      manager1.add('second');

      // Create new manager from same file
      const manager2 = createHistoryManager({ persistPath: historyPath });

      expect(manager2.getHistory()).toEqual(['first', 'second']);
    });
  });

  describe('add()', () => {
    it('should add entries to history', () => {
      const manager = createHistoryManager();

      manager.add('first message');
      manager.add('second message');

      expect(manager.getHistory()).toEqual(['first message', 'second message']);
    });

    it('should not add empty strings', () => {
      const manager = createHistoryManager();

      manager.add('');
      manager.add('   ');

      expect(manager.getHistory()).toHaveLength(0);
    });

    it('should not add duplicates of last entry', () => {
      const manager = createHistoryManager();

      manager.add('same message');
      manager.add('same message');
      manager.add('same message');

      expect(manager.getHistory()).toHaveLength(1);
    });

    it('should reset navigation index after adding', () => {
      const manager = createHistoryManager();

      manager.add('first');
      manager.add('second');
      manager.previous(); // Go back in history

      manager.add('third'); // Should reset

      expect(manager.getCurrent()).toBeNull();
    });

    it('should trim entries', () => {
      const manager = createHistoryManager();

      manager.add('  spaced message  ');

      expect(manager.getHistory()[0]).toBe('spaced message');
    });

    it('should persist to file if path provided', () => {
      const manager = createHistoryManager({ persistPath: historyPath });

      manager.add('persisted message');

      expect(existsSync(historyPath)).toBe(true);
    });
  });

  describe('previous()', () => {
    it('should return previous entry', () => {
      const manager = createHistoryManager();
      manager.add('first');
      manager.add('second');
      manager.add('third');

      expect(manager.previous()).toBe('third');
      expect(manager.previous()).toBe('second');
      expect(manager.previous()).toBe('first');
    });

    it('should return null if no history', () => {
      const manager = createHistoryManager();

      expect(manager.previous()).toBeNull();
    });

    it('should stop at oldest entry', () => {
      const manager = createHistoryManager();
      manager.add('only one');

      expect(manager.previous()).toBe('only one');
      expect(manager.previous()).toBe('only one');
      expect(manager.previous()).toBe('only one');
    });

    it('should update current index', () => {
      const manager = createHistoryManager();
      manager.add('first');
      manager.add('second');

      manager.previous();

      expect(manager.getCurrent()).toBe('second');
    });
  });

  describe('next()', () => {
    it('should return next entry after going back', () => {
      const manager = createHistoryManager();
      manager.add('first');
      manager.add('second');
      manager.add('third');

      manager.previous(); // third
      manager.previous(); // second
      manager.previous(); // first

      expect(manager.next()).toBe('second');
      expect(manager.next()).toBe('third');
    });

    it('should return null when at newest entry', () => {
      const manager = createHistoryManager();
      manager.add('first');
      manager.add('second');

      manager.previous();
      manager.previous();
      manager.next();
      manager.next();

      expect(manager.next()).toBeNull();
    });

    it('should return null if not navigating', () => {
      const manager = createHistoryManager();
      manager.add('first');

      expect(manager.next()).toBeNull();
    });
  });

  describe('getCurrent()', () => {
    it('should return null when not navigating', () => {
      const manager = createHistoryManager();
      manager.add('entry');

      expect(manager.getCurrent()).toBeNull();
    });

    it('should return current entry during navigation', () => {
      const manager = createHistoryManager();
      manager.add('first');
      manager.add('second');

      manager.previous();

      expect(manager.getCurrent()).toBe('second');
    });
  });

  describe('reset()', () => {
    it('should reset navigation to default state', () => {
      const manager = createHistoryManager();
      manager.add('first');
      manager.add('second');

      manager.previous();
      manager.previous();
      manager.reset();

      expect(manager.getCurrent()).toBeNull();
      expect(manager.previous()).toBe('second'); // Start from end again
    });
  });

  describe('clear()', () => {
    it('should clear all history', () => {
      const manager = createHistoryManager();
      manager.add('first');
      manager.add('second');

      manager.clear();

      expect(manager.getHistory()).toHaveLength(0);
    });

    it('should also clear persisted history', () => {
      const manager = createHistoryManager({ persistPath: historyPath });
      manager.add('entry');
      manager.clear();

      // Create new manager to verify file is cleared
      const manager2 = createHistoryManager({ persistPath: historyPath });
      expect(manager2.getHistory()).toHaveLength(0);
    });
  });

  describe('search()', () => {
    it('should find entries containing query', () => {
      const manager = createHistoryManager();
      manager.add('hello world');
      manager.add('goodbye world');
      manager.add('hello there');

      const results = manager.search('hello');

      expect(results).toHaveLength(2);
      expect(results).toContain('hello world');
      expect(results).toContain('hello there');
    });

    it('should be case insensitive', () => {
      const manager = createHistoryManager();
      manager.add('Hello World');
      manager.add('HELLO there');

      const results = manager.search('hello');

      expect(results).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const manager = createHistoryManager();
      manager.add('one');
      manager.add('two');

      const results = manager.search('three');

      expect(results).toHaveLength(0);
    });
  });

  describe('maxSize limit', () => {
    it('should remove oldest entries when exceeding maxSize', () => {
      const manager = createHistoryManager({ maxSize: 3 });

      manager.add('one');
      manager.add('two');
      manager.add('three');
      manager.add('four');

      const history = manager.getHistory();
      expect(history).toHaveLength(3);
      expect(history).toEqual(['two', 'three', 'four']);
    });
  });

  describe('persistence', () => {
    it('should handle missing directory gracefully', () => {
      const deepPath = join(testDir, 'deep', 'nested', 'history.json');
      const manager = createHistoryManager({ persistPath: deepPath });

      manager.add('test');

      expect(existsSync(deepPath)).toBe(true);
    });

    it('should handle corrupted file gracefully', async () => {
      const { writeFileSync } = await import('fs');
      writeFileSync(historyPath, 'not valid json {{{');

      const manager = createHistoryManager({ persistPath: historyPath });

      expect(manager.getHistory()).toHaveLength(0);
    });
  });
});
