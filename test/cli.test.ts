/**
 * CLI Integration Tests
 *
 * Following CFAD-20: Pipe-based testing for CLI tools
 * Tests use stdin/stdout pipes for deterministic, snapshot-friendly tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runCLI, runCLISuccess, stripAnsi, assertContains } from './helpers/cli-runner.js';

describe('Zosia CLI', () => {
  describe('--help', () => {
    it('should display help text', async () => {
      const result = await runCLISuccess(['--help']);

      expect(result.exitCode).toBe(0);
      assertContains(result.stdout, 'zosia');
      assertContains(result.stdout, 'interactive TUI');
    });

    it('should list all commands', async () => {
      const result = await runCLISuccess(['--help']);

      const output = stripAnsi(result.stdout);
      expect(output).toContain('setup');
      expect(output).toContain('tui');
      expect(output).toContain('chat');
      expect(output).toContain('status');
      expect(output).toContain('config');
    });
  });

  describe('--version', () => {
    it('should display version number', async () => {
      const result = await runCLISuccess(['--version']);

      expect(result.exitCode).toBe(0);
      expect(stripAnsi(result.stdout)).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('status command', () => {
    it('should display system status', async () => {
      const result = await runCLI(['status'], { timeout: 10000 });

      // Status command should complete (may show warnings for missing services)
      expect(result.exitCode).toBe(0);
      assertContains(result.stdout, 'Zosia System Status');
    });

    it('should check conscious mind status', async () => {
      const result = await runCLI(['status'], { timeout: 10000 });

      const output = stripAnsi(result.stdout);
      // Should mention conscious mind (may be ready or show warning)
      expect(output.toLowerCase()).toMatch(/conscious mind/i);
    });
  });

  describe('config command', () => {
    it('should show current configuration', async () => {
      const result = await runCLISuccess(['config', 'show']);

      assertContains(result.stdout, 'Configuration');
    });

    it('should show help when no subcommand', async () => {
      const result = await runCLISuccess(['config']);

      const output = stripAnsi(result.stdout);
      expect(output).toContain('provider');
      expect(output).toContain('model');
    });
  });

  describe('config model command', () => {
    it('should show current model when no argument', async () => {
      const result = await runCLISuccess(['config', 'model']);

      assertContains(result.stdout, 'Model');
    });
  });

  describe('config models command', () => {
    it('should list recommended models with --recommended', async () => {
      const result = await runCLISuccess(['config', 'models', '--recommended']);

      assertContains(result.stdout, 'Recommended Models');
    });
  });

  describe('help-topic command', () => {
    it('should show architecture help', async () => {
      const result = await runCLISuccess(['help-topic', 'architecture']);

      assertContains(result.stdout, 'dual-consciousness');
      assertContains(result.stdout, 'I-Layer');
      assertContains(result.stdout, 'We-Layer');
    });

    it('should show memory help', async () => {
      const result = await runCLISuccess(['help-topic', 'memory']);

      assertContains(result.stdout, 'Graphiti');
    });

    it('should show error for unknown topic', async () => {
      const result = await runCLI(['help-topic', 'nonexistent']);

      assertContains(result.stdout, 'Unknown topic');
    });
  });

  describe('whoami command', () => {
    it('should indicate not logged in when no session', async () => {
      const result = await runCLI(['whoami'], {
        env: {
          // Use a temp config dir to ensure no existing session
          HOME: '/tmp/zosia-test-' + Date.now(),
        },
      });

      const output = stripAnsi(result.stdout);
      expect(output.toLowerCase()).toMatch(/not logged in|login/i);
    });
  });

  describe('default behavior', () => {
    it('bare message without -p flag should show hint', async () => {
      // Running with just a message (no -p flag) should show a helpful hint
      const result = await runCLI(['hello'], { timeout: 10000 });

      const output = stripAnsi(result.stdout + result.stderr);
      // Should show hint about using -p flag for non-interactive mode
      expect(output).toContain('-p');
    });
  });
});

describe('CLI Exit Codes', () => {
  it('should exit 0 on successful help', async () => {
    const result = await runCLI(['--help']);
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 on successful version', async () => {
    const result = await runCLI(['--version']);
    expect(result.exitCode).toBe(0);
  });
});

describe('CLI Performance', () => {
  it('should complete help in under 2 seconds', async () => {
    const result = await runCLI(['--help']);

    expect(result.duration).toBeLessThan(2000);
  });

  it('should complete version in under 2 seconds', async () => {
    const result = await runCLI(['--version']);

    expect(result.duration).toBeLessThan(2000);
  });
});

/**
 * Print Mode Tests (-p/--print flag)
 *
 * Following CFAD-20: Pipe-based testing for CLI tools
 * These tests verify the non-interactive print mode aligns with Claude Code conventions
 */
describe('Print Mode (-p/--print)', () => {
  describe('flag validation', () => {
    it('-p without prompt should exit with error', async () => {
      const result = await runCLI(['-p']);

      expect(result.exitCode).toBe(1);
      const output = stripAnsi(result.stdout + result.stderr);
      expect(output).toContain('-p/--print requires a prompt');
    });

    it('--print without prompt should exit with error', async () => {
      const result = await runCLI(['--print']);

      expect(result.exitCode).toBe(1);
      const output = stripAnsi(result.stdout + result.stderr);
      expect(output).toContain('-p/--print requires a prompt');
    });
  });

  describe('help documentation', () => {
    it('--help should document -p flag', async () => {
      const result = await runCLISuccess(['--help']);

      const output = stripAnsi(result.stdout);
      expect(output).toContain('-p');
      expect(output).toContain('--print');
      expect(output).toContain('non-interactive');
    });

    it('--help should document -d flag', async () => {
      const result = await runCLISuccess(['--help']);

      const output = stripAnsi(result.stdout);
      expect(output).toContain('-d');
      expect(output).toContain('--debug');
    });

    it('--help should document -u flag', async () => {
      const result = await runCLISuccess(['--help']);

      const output = stripAnsi(result.stdout);
      expect(output).toContain('-u');
      expect(output).toContain('--user');
    });
  });

  describe('print mode execution', () => {
    it('-p with prompt should produce output', async () => {
      // This test requires API key but validates the output format
      const result = await runCLI(['-p', 'hello'], { timeout: 30000 });

      // Should either succeed with response or fail with API error
      const output = stripAnsi(result.stdout + result.stderr);
      const hasResponse = output.includes('ZOSIA') || output.toLowerCase().includes('hello');
      const hasApiError = output.toLowerCase().includes('api') || output.toLowerCase().includes('key');

      expect(hasResponse || hasApiError).toBe(true);
    });

    it('--print long form should work same as -p', async () => {
      const result = await runCLI(['--print', 'test'], { timeout: 30000 });

      // Should either succeed with response or fail with API error
      const output = stripAnsi(result.stdout + result.stderr);
      const hasResponse = output.includes('ZOSIA');
      const hasApiError = output.toLowerCase().includes('api') || output.toLowerCase().includes('key');

      expect(hasResponse || hasApiError).toBe(true);
    });

    it('-p -d should enable debug output', async () => {
      const result = await runCLI(['-p', '-d', 'hi'], { timeout: 30000 });

      const output = stripAnsi(result.stdout + result.stderr);
      // Debug mode shows layer activity OR we get an API error
      const hasDebug = output.includes('DEBUG') || output.includes('WE-LAYER') || output.includes('I-LAYER');
      const hasApiError = output.toLowerCase().includes('api') || output.toLowerCase().includes('key');

      expect(hasDebug || hasApiError).toBe(true);
    });

    it('-d -p order should not matter', async () => {
      const result = await runCLI(['-d', '-p', 'hi'], { timeout: 30000 });

      const output = stripAnsi(result.stdout + result.stderr);
      const hasDebug = output.includes('DEBUG') || output.includes('WE-LAYER') || output.includes('I-LAYER');
      const hasApiError = output.toLowerCase().includes('api') || output.toLowerCase().includes('key');

      expect(hasDebug || hasApiError).toBe(true);
    });
  });

  describe('flag combinations', () => {
    it('-p with -u should accept user ID', async () => {
      const result = await runCLI(['-p', '-u', 'test-user', 'hello'], { timeout: 30000 });

      // Should process without error about invalid flags
      const output = stripAnsi(result.stdout + result.stderr);
      expect(output).not.toContain('unknown option');
      expect(output).not.toContain('invalid');
    });

    it('-p with --clear should accept clear flag', async () => {
      const result = await runCLI(['-p', '--clear', 'hello'], { timeout: 30000 });

      // Should process without error about invalid flags
      const output = stripAnsi(result.stdout + result.stderr);
      expect(output).not.toContain('unknown option');
    });

    it('combined flags -p -d -u should work together', async () => {
      const result = await runCLI(['-p', '-d', '-u', 'test-user', 'hello'], { timeout: 30000 });

      // Should process without error about invalid flags
      const output = stripAnsi(result.stdout + result.stderr);
      expect(output).not.toContain('unknown option');
    });
  });
});

/**
 * Pipe Input Tests
 *
 * Tests for stdin piping support (future feature)
 */
describe('Pipe Input', () => {
  it('should handle empty stdin gracefully', async () => {
    const result = await runCLI(['-p', 'test'], {
      stdin: '',
      timeout: 30000,
    });

    // Should not crash with empty stdin
    expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);
  });
});
