/**
 * Slash Commands Tests - TDD
 *
 * Tests for parsing and executing slash commands in the TUI.
 * Commands like /help, /clear, /save, /retry, /copy
 */

import { describe, it, expect, vi } from 'vitest';

import {
  parseSlashCommand,
  isSlashCommand,
  getCommandHelp,
  COMMANDS,
  type SlashCommand,
  type ParsedCommand,
} from '../src/slash-commands.js';

describe('Slash Commands', () => {
  describe('isSlashCommand()', () => {
    it('should detect /help', () => {
      expect(isSlashCommand('/help')).toBe(true);
    });

    it('should detect /clear', () => {
      expect(isSlashCommand('/clear')).toBe(true);
    });

    it('should detect command with arguments', () => {
      expect(isSlashCommand('/save my-session.json')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isSlashCommand('/HELP')).toBe(true);
      expect(isSlashCommand('/Help')).toBe(true);
    });

    it('should NOT detect regular text', () => {
      expect(isSlashCommand('hello world')).toBe(false);
    });

    it('should NOT detect slash in middle of text', () => {
      expect(isSlashCommand('use /help command')).toBe(false);
    });

    it('should NOT detect just a slash', () => {
      expect(isSlashCommand('/')).toBe(false);
    });

    it('should NOT detect slash with space', () => {
      expect(isSlashCommand('/ help')).toBe(false);
    });
  });

  describe('parseSlashCommand()', () => {
    it('should parse /help', () => {
      const result = parseSlashCommand('/help');

      expect(result).not.toBeNull();
      expect(result!.command).toBe('help');
      expect(result!.args).toEqual([]);
    });

    it('should parse /clear', () => {
      const result = parseSlashCommand('/clear');

      expect(result).not.toBeNull();
      expect(result!.command).toBe('clear');
    });

    it('should parse /save with filename', () => {
      const result = parseSlashCommand('/save my-session.json');

      expect(result).not.toBeNull();
      expect(result!.command).toBe('save');
      expect(result!.args).toEqual(['my-session.json']);
    });

    it('should parse /load with filename', () => {
      const result = parseSlashCommand('/load session-2025-01-06.json');

      expect(result).not.toBeNull();
      expect(result!.command).toBe('load');
      expect(result!.args).toEqual(['session-2025-01-06.json']);
    });

    it('should parse command with multiple arguments', () => {
      const result = parseSlashCommand('/export md output.md');

      expect(result).not.toBeNull();
      expect(result!.command).toBe('export');
      expect(result!.args).toEqual(['md', 'output.md']);
    });

    it('should normalize command to lowercase', () => {
      const result = parseSlashCommand('/HELP');

      expect(result).not.toBeNull();
      expect(result!.command).toBe('help');
    });

    it('should handle quoted arguments', () => {
      const result = parseSlashCommand('/save "my session.json"');

      expect(result).not.toBeNull();
      expect(result!.command).toBe('save');
      expect(result!.args).toEqual(['my session.json']);
    });

    it('should return null for unknown commands', () => {
      const result = parseSlashCommand('/unknowncommand');

      expect(result).toBeNull();
    });

    it('should return null for non-command input', () => {
      const result = parseSlashCommand('just text');

      expect(result).toBeNull();
    });
  });

  describe('COMMANDS registry', () => {
    it('should include /help', () => {
      expect(COMMANDS.has('help')).toBe(true);
      expect(COMMANDS.get('help')?.description).toBeTruthy();
    });

    it('should include /clear', () => {
      expect(COMMANDS.has('clear')).toBe(true);
    });

    it('should include /retry', () => {
      expect(COMMANDS.has('retry')).toBe(true);
    });

    it('should include /save', () => {
      expect(COMMANDS.has('save')).toBe(true);
    });

    it('should include /load', () => {
      expect(COMMANDS.has('load')).toBe(true);
    });

    it('should include /copy', () => {
      expect(COMMANDS.has('copy')).toBe(true);
    });

    it('should include /exit or /quit', () => {
      expect(COMMANDS.has('exit') || COMMANDS.has('quit')).toBe(true);
    });

    it('all commands should have descriptions', () => {
      for (const [name, cmd] of COMMANDS) {
        expect(cmd.description).toBeTruthy();
        expect(cmd.description.length).toBeGreaterThan(5);
      }
    });
  });

  describe('getCommandHelp()', () => {
    it('should return help for specific command', () => {
      const help = getCommandHelp('save');

      expect(help).toContain('save');
      expect(help).toContain('session');
    });

    it('should return all commands when no arg', () => {
      const help = getCommandHelp();

      expect(help).toContain('/help');
      expect(help).toContain('/clear');
      expect(help).toContain('/save');
    });

    it('should return error for unknown command', () => {
      const help = getCommandHelp('notacommand');

      expect(help).toContain('Unknown');
    });
  });

  describe('command definitions', () => {
    it('/help should have usage example', () => {
      const cmd = COMMANDS.get('help');
      expect(cmd?.usage).toBe('/help [command]');
    });

    it('/save should have usage with filename', () => {
      const cmd = COMMANDS.get('save');
      expect(cmd?.usage).toContain('filename');
    });

    it('/load should have usage with filename', () => {
      const cmd = COMMANDS.get('load');
      expect(cmd?.usage).toContain('filename');
    });

    it('/copy should have optional block number', () => {
      const cmd = COMMANDS.get('copy');
      expect(cmd?.usage).toMatch(/\[.*\]/); // Optional argument
    });
  });

  describe('aliases', () => {
    it('/q should alias to /quit or /exit', () => {
      const result = parseSlashCommand('/q');
      expect(result).not.toBeNull();
      expect(['quit', 'exit']).toContain(result!.command);
    });

    it('/? should alias to /help', () => {
      const result = parseSlashCommand('/?');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('help');
    });

    it('/cls should alias to /clear', () => {
      const result = parseSlashCommand('/cls');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('clear');
    });

    it('/ss should alias to /sessions', () => {
      const result = parseSlashCommand('/ss');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('sessions');
    });
  });

  describe('/export command', () => {
    it('should be registered in COMMANDS', () => {
      expect(COMMANDS.has('export')).toBe(true);
    });

    it('should parse /export md', () => {
      const result = parseSlashCommand('/export md');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('export');
      expect(result!.args).toEqual(['md']);
    });

    it('should parse /export json output.json', () => {
      const result = parseSlashCommand('/export json output.json');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('export');
      expect(result!.args).toEqual(['json', 'output.json']);
    });

    it('should have proper usage string', () => {
      const cmd = COMMANDS.get('export');
      expect(cmd?.usage).toContain('md');
      expect(cmd?.usage).toContain('json');
    });
  });

  describe('/sessions command', () => {
    it('should be registered in COMMANDS', () => {
      expect(COMMANDS.has('sessions')).toBe(true);
    });

    it('should parse /sessions', () => {
      const result = parseSlashCommand('/sessions');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('sessions');
      expect(result!.args).toEqual([]);
    });

    it('should parse /sessions list', () => {
      const result = parseSlashCommand('/sessions list');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('sessions');
      expect(result!.args).toEqual(['list']);
    });

    it('should parse /sessions delete abc123', () => {
      const result = parseSlashCommand('/sessions delete abc123');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('sessions');
      expect(result!.args).toEqual(['delete', 'abc123']);
    });

    it('should have aliases', () => {
      const cmd = COMMANDS.get('sessions');
      expect(cmd?.aliases).toContain('ss');
    });
  });

  describe('/handoff command', () => {
    it('should be registered in COMMANDS', () => {
      expect(COMMANDS.has('handoff')).toBe(true);
    });

    it('should parse /handoff', () => {
      const result = parseSlashCommand('/handoff');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('handoff');
      expect(result!.args).toEqual([]);
    });

    it('should parse /handoff show', () => {
      const result = parseSlashCommand('/handoff show');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('handoff');
      expect(result!.args).toEqual(['show']);
    });

    it('should parse /handoff threshold 90', () => {
      const result = parseSlashCommand('/handoff threshold 90');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('handoff');
      expect(result!.args).toEqual(['threshold', '90']);
    });
  });

  describe('/onboarding command', () => {
    it('should be registered in COMMANDS', () => {
      expect(COMMANDS.has('onboarding')).toBe(true);
    });

    it('should parse /onboarding', () => {
      const result = parseSlashCommand('/onboarding');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('onboarding');
      expect(result!.args).toEqual([]);
    });

    it('should parse /onboarding status', () => {
      const result = parseSlashCommand('/onboarding status');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('onboarding');
      expect(result!.args).toEqual(['status']);
    });

    it('should parse /onboarding openrouter with key', () => {
      const result = parseSlashCommand('/onboarding openrouter sk-or-v1-test123');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('onboarding');
      expect(result!.args).toEqual(['openrouter', 'sk-or-v1-test123']);
    });

    it('should parse /onboarding model with model id', () => {
      const result = parseSlashCommand('/onboarding model anthropic/claude-3.5-sonnet');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('onboarding');
      expect(result!.args).toEqual(['model', 'anthropic/claude-3.5-sonnet']);
    });

    it('should parse /onboarding memory', () => {
      const result = parseSlashCommand('/onboarding memory');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('onboarding');
      expect(result!.args).toEqual(['memory']);
    });

    it('should have proper usage string', () => {
      const cmd = COMMANDS.get('onboarding');
      expect(cmd?.usage).toContain('status');
      expect(cmd?.usage).toContain('openrouter');
      expect(cmd?.usage).toContain('model');
    });

    it('should have aliases', () => {
      const cmd = COMMANDS.get('onboarding');
      expect(cmd?.aliases).toContain('setup');
      expect(cmd?.aliases).toContain('keys');
    });

    it('/setup should alias to /onboarding', () => {
      const result = parseSlashCommand('/setup');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('onboarding');
    });

    it('/keys should alias to /onboarding', () => {
      const result = parseSlashCommand('/keys');
      expect(result).not.toBeNull();
      expect(result!.command).toBe('onboarding');
    });
  });
});
