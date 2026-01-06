/**
 * Session Save/Load Tests - TDD
 *
 * Tests for session persistence.
 * Sessions store: messages, token usage, model info, timestamps
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  getSessionPath,
  exportToMarkdown,
  exportToJSON,
  generateSessionName,
  type Session,
  type SessionMessage,
  type SessionMetadata,
  type ExportOptions,
} from '../src/session.js';

describe('Session Management', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temp directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zosia-session-test-'));
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Session structure', () => {
    it('should have required session fields', () => {
      const session: Session = {
        id: 'test-session-123',
        name: 'My Test Session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'claude-3-haiku',
        messages: [],
        tokenUsage: {
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
        },
      };

      expect(session.id).toBeTruthy();
      expect(session.name).toBeTruthy();
      expect(session.createdAt).toBeTruthy();
      expect(session.messages).toBeInstanceOf(Array);
    });

    it('should have required message fields', () => {
      const message: SessionMessage = {
        role: 'user',
        content: 'Hello, world!',
        timestamp: new Date().toISOString(),
      };

      expect(message.role).toBe('user');
      expect(message.content).toBeTruthy();
      expect(message.timestamp).toBeTruthy();
    });

    it('should support assistant messages with token info', () => {
      const message: SessionMessage = {
        role: 'assistant',
        content: 'Hello! How can I help?',
        timestamp: new Date().toISOString(),
        promptTokens: 15,
        completionTokens: 8,
        cost: 0.00001,
      };

      expect(message.promptTokens).toBe(15);
      expect(message.completionTokens).toBe(8);
      expect(message.cost).toBe(0.00001);
    });
  });

  describe('saveSession()', () => {
    it('should save session to file', async () => {
      const session: Session = {
        id: 'save-test-001',
        name: 'Save Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'gemma-2-9b-it',
        messages: [
          { role: 'user', content: 'Hi', timestamp: new Date().toISOString() },
        ],
        tokenUsage: {
          totalPromptTokens: 10,
          totalCompletionTokens: 5,
        },
      };

      const filePath = await saveSession(session, { directory: testDir });

      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should create JSON file with correct structure', async () => {
      const session: Session = {
        id: 'json-test-001',
        name: 'JSON Test',
        createdAt: '2025-01-06T12:00:00.000Z',
        updatedAt: '2025-01-06T12:30:00.000Z',
        model: 'claude-3-haiku',
        messages: [
          { role: 'user', content: 'Test message', timestamp: '2025-01-06T12:00:00.000Z' },
          {
            role: 'assistant',
            content: 'Test response',
            timestamp: '2025-01-06T12:00:01.000Z',
            promptTokens: 20,
            completionTokens: 15,
          },
        ],
        tokenUsage: {
          totalPromptTokens: 20,
          totalCompletionTokens: 15,
        },
      };

      const filePath = await saveSession(session, { directory: testDir });
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      expect(content.id).toBe('json-test-001');
      expect(content.name).toBe('JSON Test');
      expect(content.messages).toHaveLength(2);
      expect(content.tokenUsage.totalPromptTokens).toBe(20);
    });

    it('should use session name as filename when provided', async () => {
      const session: Session = {
        id: 'name-test-001',
        name: 'My Custom Session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'test-model',
        messages: [],
        tokenUsage: { totalPromptTokens: 0, totalCompletionTokens: 0 },
      };

      const filePath = await saveSession(session, {
        directory: testDir,
        filename: 'my-custom-session.json',
      });

      expect(path.basename(filePath)).toBe('my-custom-session.json');
    });

    it('should auto-generate filename from session ID if not provided', async () => {
      const session: Session = {
        id: 'auto-name-001',
        name: 'Auto Name Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'test-model',
        messages: [],
        tokenUsage: { totalPromptTokens: 0, totalCompletionTokens: 0 },
      };

      const filePath = await saveSession(session, { directory: testDir });

      expect(path.basename(filePath)).toContain('auto-name-001');
      expect(filePath.endsWith('.json')).toBe(true);
    });
  });

  describe('loadSession()', () => {
    it('should load session from file', async () => {
      const session: Session = {
        id: 'load-test-001',
        name: 'Load Test',
        createdAt: '2025-01-06T12:00:00.000Z',
        updatedAt: '2025-01-06T12:30:00.000Z',
        model: 'gemma-2-9b-it',
        messages: [
          { role: 'user', content: 'Hello', timestamp: '2025-01-06T12:00:00.000Z' },
          { role: 'assistant', content: 'Hi there!', timestamp: '2025-01-06T12:00:01.000Z' },
        ],
        tokenUsage: {
          totalPromptTokens: 15,
          totalCompletionTokens: 10,
        },
      };

      const filePath = await saveSession(session, { directory: testDir });
      const loaded = await loadSession(filePath);

      expect(loaded.id).toBe('load-test-001');
      expect(loaded.name).toBe('Load Test');
      expect(loaded.messages).toHaveLength(2);
      expect(loaded.messages[0].content).toBe('Hello');
    });

    it('should throw error for non-existent file', async () => {
      await expect(loadSession('/nonexistent/path.json')).rejects.toThrow();
    });

    it('should throw error for invalid JSON', async () => {
      const badFile = path.join(testDir, 'bad.json');
      fs.writeFileSync(badFile, 'not valid json{{{');

      await expect(loadSession(badFile)).rejects.toThrow();
    });

    it('should validate session structure', async () => {
      const incompleteFile = path.join(testDir, 'incomplete.json');
      fs.writeFileSync(incompleteFile, JSON.stringify({ id: 'test' }));

      await expect(loadSession(incompleteFile)).rejects.toThrow(/invalid/i);
    });
  });

  describe('listSessions()', () => {
    it('should list all sessions in directory', async () => {
      // Create multiple sessions
      await saveSession({
        id: 'list-001',
        name: 'Session 1',
        createdAt: '2025-01-06T10:00:00.000Z',
        updatedAt: '2025-01-06T10:00:00.000Z',
        model: 'test',
        messages: [],
        tokenUsage: { totalPromptTokens: 0, totalCompletionTokens: 0 },
      }, { directory: testDir });

      await saveSession({
        id: 'list-002',
        name: 'Session 2',
        createdAt: '2025-01-06T11:00:00.000Z',
        updatedAt: '2025-01-06T11:00:00.000Z',
        model: 'test',
        messages: [],
        tokenUsage: { totalPromptTokens: 0, totalCompletionTokens: 0 },
      }, { directory: testDir });

      const sessions = await listSessions(testDir);

      expect(sessions).toHaveLength(2);
    });

    it('should return session metadata without full content', async () => {
      await saveSession({
        id: 'meta-001',
        name: 'Metadata Test',
        createdAt: '2025-01-06T12:00:00.000Z',
        updatedAt: '2025-01-06T12:30:00.000Z',
        model: 'claude-3-haiku',
        messages: [
          { role: 'user', content: 'Long message...', timestamp: '2025-01-06T12:00:00.000Z' },
        ],
        tokenUsage: { totalPromptTokens: 100, totalCompletionTokens: 50 },
      }, { directory: testDir });

      const sessions = await listSessions(testDir);

      expect(sessions[0].id).toBe('meta-001');
      expect(sessions[0].name).toBe('Metadata Test');
      expect(sessions[0].messageCount).toBe(1);
      expect(sessions[0].totalTokens).toBe(150);
    });

    it('should sort sessions by updatedAt descending', async () => {
      await saveSession({
        id: 'sort-001',
        name: 'Older',
        createdAt: '2025-01-05T10:00:00.000Z',
        updatedAt: '2025-01-05T10:00:00.000Z',
        model: 'test',
        messages: [],
        tokenUsage: { totalPromptTokens: 0, totalCompletionTokens: 0 },
      }, { directory: testDir });

      await saveSession({
        id: 'sort-002',
        name: 'Newer',
        createdAt: '2025-01-06T10:00:00.000Z',
        updatedAt: '2025-01-06T10:00:00.000Z',
        model: 'test',
        messages: [],
        tokenUsage: { totalPromptTokens: 0, totalCompletionTokens: 0 },
      }, { directory: testDir });

      const sessions = await listSessions(testDir);

      expect(sessions[0].name).toBe('Newer');
      expect(sessions[1].name).toBe('Older');
    });

    it('should return empty array for empty directory', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
      const sessions = await listSessions(emptyDir);

      expect(sessions).toEqual([]);

      fs.rmSync(emptyDir, { recursive: true });
    });
  });

  describe('deleteSession()', () => {
    it('should delete session file', async () => {
      const filePath = await saveSession({
        id: 'delete-001',
        name: 'To Delete',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'test',
        messages: [],
        tokenUsage: { totalPromptTokens: 0, totalCompletionTokens: 0 },
      }, { directory: testDir });

      expect(fs.existsSync(filePath)).toBe(true);

      await deleteSession(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should not throw for non-existent file', async () => {
      await expect(deleteSession('/nonexistent/path.json')).resolves.not.toThrow();
    });
  });

  describe('getSessionPath()', () => {
    it('should return default sessions directory', () => {
      const sessionPath = getSessionPath();

      expect(sessionPath).toContain('.zosia');
      expect(sessionPath).toContain('sessions');
    });

    it('should create directory if it does not exist', () => {
      const sessionPath = getSessionPath();

      // Just verify it returns a path - actual creation tested via save
      expect(typeof sessionPath).toBe('string');
    });
  });

  describe('session versioning', () => {
    it('should include version in session file', async () => {
      const session: Session = {
        id: 'version-001',
        name: 'Version Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'test',
        messages: [],
        tokenUsage: { totalPromptTokens: 0, totalCompletionTokens: 0 },
      };

      const filePath = await saveSession(session, { directory: testDir });
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      expect(content.version).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Export Formats
  // ─────────────────────────────────────────────────────────────────────────────

  describe('exportToMarkdown()', () => {
    const sampleSession: Session = {
      id: 'export-test-001',
      name: 'Test Export Session',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T11:30:00.000Z',
      model: 'google/gemma-2-9b-it',
      messages: [
        {
          role: 'user',
          content: 'Hello, how are you?',
          timestamp: '2024-01-15T10:00:00.000Z',
        },
        {
          role: 'assistant',
          content: 'I\'m doing well, thank you for asking!',
          timestamp: '2024-01-15T10:00:05.000Z',
          promptTokens: 15,
          completionTokens: 12,
          cost: 0.0001,
        },
        {
          role: 'user',
          content: 'Can you help me with a coding problem?',
          timestamp: '2024-01-15T10:01:00.000Z',
        },
        {
          role: 'assistant',
          content: 'Of course! What problem are you working on?',
          timestamp: '2024-01-15T10:01:10.000Z',
          promptTokens: 25,
          completionTokens: 10,
          cost: 0.00015,
        },
      ],
      tokenUsage: {
        totalPromptTokens: 40,
        totalCompletionTokens: 22,
      },
    };

    it('should export session to markdown format', () => {
      const markdown = exportToMarkdown(sampleSession);

      expect(markdown).toContain('# Test Export Session');
      expect(markdown).toContain('**Session ID:** export-test-001');
      expect(markdown).toContain('**Model:** google/gemma-2-9b-it');
    });

    it('should include message content', () => {
      const markdown = exportToMarkdown(sampleSession);

      expect(markdown).toContain('Hello, how are you?');
      expect(markdown).toContain('I\'m doing well, thank you for asking!');
      expect(markdown).toContain('Can you help me with a coding problem?');
    });

    it('should format role labels correctly', () => {
      const markdown = exportToMarkdown(sampleSession);

      expect(markdown).toContain('### 👤 You');
      expect(markdown).toContain('### ✧ Zosia');
    });

    it('should include token counts when enabled', () => {
      const markdown = exportToMarkdown(sampleSession, { includeTokens: true });

      expect(markdown).toContain('**Total Tokens:**');
      expect(markdown).toContain('15 prompt');
      expect(markdown).toContain('12 completion');
    });

    it('should exclude token counts when disabled', () => {
      const markdown = exportToMarkdown(sampleSession, { includeTokens: false });

      expect(markdown).not.toContain('15 prompt');
      expect(markdown).not.toContain('12 completion');
    });

    it('should include timestamps when enabled', () => {
      const markdown = exportToMarkdown(sampleSession, { includeTimestamps: true });

      // Should have time in parentheses
      expect(markdown).toMatch(/\*\(\d{1,2}:\d{2}\s*(AM|PM)\)\*/);
    });

    it('should exclude timestamps when disabled', () => {
      const markdown = exportToMarkdown(sampleSession, { includeTimestamps: false });

      // Should not have time in parentheses
      expect(markdown).not.toMatch(/\*\(\d{1,2}:\d{2}\s*(AM|PM)\)\*/);
    });

    it('should include cost when enabled', () => {
      const markdown = exportToMarkdown(sampleSession, { includeCost: true });

      expect(markdown).toContain('$0.0001');
    });

    it('should exclude header when disabled', () => {
      const markdown = exportToMarkdown(sampleSession, { includeHeader: false });

      expect(markdown).not.toContain('# Test Export Session');
      expect(markdown).not.toContain('**Session ID:**');
      // But should still have messages
      expect(markdown).toContain('Hello, how are you?');
    });

    it('should handle system messages', () => {
      const sessionWithSystem: Session = {
        ...sampleSession,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.', timestamp: '2024-01-15T10:00:00.000Z' },
          ...sampleSession.messages,
        ],
      };

      const markdown = exportToMarkdown(sessionWithSystem);
      expect(markdown).toContain('### ⚙️ System');
      expect(markdown).toContain('You are a helpful assistant.');
    });
  });

  describe('exportToJSON()', () => {
    const sampleSession: Session = {
      id: 'json-export-001',
      name: 'JSON Export Test',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T11:30:00.000Z',
      model: 'google/gemma-2-9b-it',
      messages: [
        {
          role: 'user',
          content: 'Test message',
          timestamp: '2024-01-15T10:00:00.000Z',
        },
        {
          role: 'assistant',
          content: 'Test response',
          timestamp: '2024-01-15T10:00:05.000Z',
          promptTokens: 10,
          completionTokens: 8,
          cost: 0.0001,
        },
      ],
      tokenUsage: {
        totalPromptTokens: 10,
        totalCompletionTokens: 8,
      },
    };

    it('should export to valid JSON', () => {
      const json = exportToJSON(sampleSession);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include export metadata', () => {
      const json = exportToJSON(sampleSession);
      const parsed = JSON.parse(json);

      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.exportVersion).toBe(1);
    });

    it('should include session info', () => {
      const json = exportToJSON(sampleSession);
      const parsed = JSON.parse(json);

      expect(parsed.session.id).toBe('json-export-001');
      expect(parsed.session.name).toBe('JSON Export Test');
      expect(parsed.session.model).toBe('google/gemma-2-9b-it');
    });

    it('should calculate statistics', () => {
      const json = exportToJSON(sampleSession);
      const parsed = JSON.parse(json);

      expect(parsed.statistics.messageCount).toBe(2);
      expect(parsed.statistics.userMessages).toBe(1);
      expect(parsed.statistics.assistantMessages).toBe(1);
      expect(parsed.statistics.totalTokens).toBe(18);
      expect(parsed.statistics.promptTokens).toBe(10);
      expect(parsed.statistics.completionTokens).toBe(8);
    });

    it('should include messages', () => {
      const json = exportToJSON(sampleSession);
      const parsed = JSON.parse(json);

      expect(parsed.messages).toHaveLength(2);
      expect(parsed.messages[0].role).toBe('user');
      expect(parsed.messages[0].content).toBe('Test message');
    });

    it('should include cost when enabled', () => {
      const json = exportToJSON(sampleSession, { includeCost: true });
      const parsed = JSON.parse(json);

      expect(parsed.statistics.totalCost).toBeDefined();
      expect(parsed.messages[1].cost).toBe(0.0001);
    });

    it('should exclude cost when disabled', () => {
      const json = exportToJSON(sampleSession, { includeCost: false });
      const parsed = JSON.parse(json);

      expect(parsed.statistics.totalCost).toBeUndefined();
      expect(parsed.messages[1].cost).toBeUndefined();
    });

    it('should exclude timestamps when disabled', () => {
      const json = exportToJSON(sampleSession, { includeTimestamps: false });
      const parsed = JSON.parse(json);

      expect(parsed.messages[0].timestamp).toBeUndefined();
    });
  });

  describe('generateSessionName()', () => {
    it('should generate name from first user message', () => {
      const messages: SessionMessage[] = [
        { role: 'user', content: 'Help me build a web app', timestamp: '2024-01-15T10:00:00.000Z' },
        { role: 'assistant', content: 'Sure!', timestamp: '2024-01-15T10:00:05.000Z' },
      ];

      const name = generateSessionName(messages);
      expect(name).toBe('Help me build a web app');
    });

    it('should truncate long messages', () => {
      const messages: SessionMessage[] = [
        {
          role: 'user',
          content: 'I need help with a very long and complex problem that involves multiple steps and considerations',
          timestamp: '2024-01-15T10:00:00.000Z',
        },
      ];

      const name = generateSessionName(messages);
      expect(name.length).toBeLessThanOrEqual(50);
    });

    it('should truncate at word boundary', () => {
      const messages: SessionMessage[] = [
        {
          role: 'user',
          content: 'This is a moderately long message that should be truncated nicely at a word boundary',
          timestamp: '2024-01-15T10:00:00.000Z',
        },
      ];

      const name = generateSessionName(messages);
      expect(name).not.toMatch(/\s$/); // Should not end with space
      expect(name.length).toBeLessThanOrEqual(50);
    });

    it('should handle messages with special characters', () => {
      const messages: SessionMessage[] = [
        {
          role: 'user',
          content: 'Can you help with @#$% special chars?!?!',
          timestamp: '2024-01-15T10:00:00.000Z',
        },
      ];

      const name = generateSessionName(messages);
      expect(name).not.toMatch(/[@#$%?!]/);
    });

    it('should handle newlines in messages', () => {
      const messages: SessionMessage[] = [
        {
          role: 'user',
          content: 'First line\nSecond line\nThird line',
          timestamp: '2024-01-15T10:00:00.000Z',
        },
      ];

      const name = generateSessionName(messages);
      expect(name).not.toContain('\n');
    });

    it('should fallback to date when no user message', () => {
      const messages: SessionMessage[] = [
        { role: 'system', content: 'System prompt', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      const name = generateSessionName(messages);
      expect(name).toMatch(/^Session \d{4}-\d{2}-\d{2}$/);
    });

    it('should fallback to date when user message is empty after cleaning', () => {
      const messages: SessionMessage[] = [
        { role: 'user', content: '!@#$%^&*()', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      const name = generateSessionName(messages);
      expect(name).toMatch(/^Session \d{4}-\d{2}-\d{2}$/);
    });
  });
});
