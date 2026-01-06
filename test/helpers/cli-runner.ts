/**
 * CLI Test Runner - Pipe-based testing utilities
 *
 * Following CFAD-20: Pipe-based testing for CLI tools
 * Uses child_process to spawn the CLI and capture stdout/stderr
 */

import { spawn, type ChildProcess, type SpawnOptions } from 'child_process';
import { resolve } from 'path';

export interface CLIResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface CLIOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  stdin?: string;
}

const CLI_PATH = resolve(import.meta.dirname, '../../src/cli.ts');

/**
 * Run the Zosia CLI with arguments and capture output
 */
export async function runCLI(args: string[], options: CLIOptions = {}): Promise<CLIResult> {
  const startTime = Date.now();
  const timeout = options.timeout ?? 15000;

  return new Promise((resolve, reject) => {
    const spawnOptions: SpawnOptions = {
      cwd: options.cwd ?? process.cwd(),
      env: {
        ...process.env,
        // Disable color output for consistent test assertions
        NO_COLOR: '1',
        FORCE_COLOR: '0',
        // Override any interactive prompts
        CI: 'true',
        ...options.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    };

    const child: ChildProcess = spawn('npx', ['tsx', CLI_PATH, ...args], spawnOptions);

    let stdout = '';
    let stderr = '';
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill('SIGKILL');
        reject(new Error(`CLI timed out after ${timeout}ms`));
      }
    }, timeout);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Write to stdin if provided
    if (options.stdin) {
      child.stdin?.write(options.stdin);
      child.stdin?.end();
    } else {
      child.stdin?.end();
    }

    child.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({
          exitCode: code ?? 0,
          stdout,
          stderr,
          duration: Date.now() - startTime,
        });
      }
    });

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
}

/**
 * Run CLI and expect success (exit code 0)
 */
export async function runCLISuccess(args: string[], options: CLIOptions = {}): Promise<CLIResult> {
  const result = await runCLI(args, options);
  if (result.exitCode !== 0) {
    throw new Error(
      `CLI failed with exit code ${result.exitCode}\n` +
      `stdout: ${result.stdout}\n` +
      `stderr: ${result.stderr}`
    );
  }
  return result;
}

/**
 * Run CLI and expect failure (non-zero exit code)
 */
export async function runCLIFailure(args: string[], options: CLIOptions = {}): Promise<CLIResult> {
  const result = await runCLI(args, options);
  if (result.exitCode === 0) {
    throw new Error(
      `CLI succeeded but expected failure\n` +
      `stdout: ${result.stdout}\n` +
      `stderr: ${result.stderr}`
    );
  }
  return result;
}

/**
 * Strip ANSI escape codes from string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

/**
 * Assert output contains text (case insensitive)
 */
export function assertContains(output: string, text: string): void {
  const normalized = stripAnsi(output).toLowerCase();
  const search = text.toLowerCase();
  if (!normalized.includes(search)) {
    throw new Error(`Expected output to contain "${text}"\nActual output: ${output}`);
  }
}

/**
 * Assert output matches regex
 */
export function assertMatches(output: string, pattern: RegExp): void {
  const normalized = stripAnsi(output);
  if (!pattern.test(normalized)) {
    throw new Error(`Expected output to match ${pattern}\nActual output: ${output}`);
  }
}
