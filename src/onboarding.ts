/**
 * Onboarding Module
 *
 * Checks setup status and helps users configure Zosia.
 * Used by /onboarding slash command in the TUI.
 */

import { loadConfig, getOpenRouterKey, setOpenRouterKey, setConsciousMindModel } from './config.js';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SetupItem {
  name: string;
  status: 'ok' | 'warning' | 'missing';
  message: string;
  howToFix?: string;
}

export interface OnboardingStatus {
  items: SetupItem[];
  overallReady: boolean;
  readyCount: number;
  totalCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Checkers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check Node.js version
 */
export function checkNodeVersion(): SetupItem {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);

  if (major >= 18) {
    return {
      name: 'Node.js',
      status: 'ok',
      message: `${version} (meets requirement)`,
    };
  }

  if (major >= 16) {
    return {
      name: 'Node.js',
      status: 'warning',
      message: `${version} - version 18+ recommended`,
      howToFix: 'Upgrade Node.js at https://nodejs.org',
    };
  }

  return {
    name: 'Node.js',
    status: 'missing',
    message: `${version} - version 18+ required`,
    howToFix: 'Install Node.js 18+ from https://nodejs.org',
  };
}

/**
 * Check OpenRouter API key status
 */
export function checkOpenRouterKey(): SetupItem {
  const key = getOpenRouterKey();
  const config = loadConfig();

  if (key && config.openrouterKeyValid) {
    return {
      name: 'OpenRouter API Key',
      status: 'ok',
      message: `Configured and valid (${maskKey(key)})`,
    };
  }

  if (key && !config.openrouterKeyValid) {
    return {
      name: 'OpenRouter API Key',
      status: 'warning',
      message: `Key set but not validated (${maskKey(key)})`,
      howToFix: 'Run /onboarding openrouter to re-validate',
    };
  }

  // Check environment variable
  if (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY) {
    return {
      name: 'OpenRouter API Key',
      status: 'ok',
      message: 'Using environment variable',
    };
  }

  return {
    name: 'OpenRouter API Key',
    status: 'missing',
    message: 'Not configured - required for conscious responses',
    howToFix: 'Run /onboarding openrouter YOUR_KEY or get one at https://openrouter.ai/keys',
  };
}

/**
 * Check Claude Code installation and auth
 */
export async function checkClaudeCode(): Promise<SetupItem> {
  // Check if Claude Code is installed
  const installed = await new Promise<boolean>((resolve) => {
    const child = spawn('claude', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });

  if (!installed) {
    return {
      name: 'Claude Code',
      status: 'missing',
      message: 'Not installed - required for unconscious processing',
      howToFix: 'npm install -g @anthropic-ai/claude-code && claude login',
    };
  }

  // Check authentication
  const credPath = join(homedir(), '.claude', 'credentials.json');
  if (existsSync(credPath)) {
    try {
      const creds = JSON.parse(readFileSync(credPath, 'utf-8'));
      if (creds.accessToken) {
        const expired = creds.expiresAt && new Date(creds.expiresAt) < new Date();
        if (!expired) {
          return {
            name: 'Claude Code',
            status: 'ok',
            message: 'Installed and authenticated (Max mode)',
          };
        }
        return {
          name: 'Claude Code',
          status: 'warning',
          message: 'Auth token expired',
          howToFix: 'Run: claude login',
        };
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check for API key
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      name: 'Claude Code',
      status: 'ok',
      message: 'Using ANTHROPIC_API_KEY (API mode)',
    };
  }

  return {
    name: 'Claude Code',
    status: 'warning',
    message: 'Installed but not authenticated',
    howToFix: 'Run: claude login',
  };
}

/**
 * Check Graphiti memory connection
 */
export async function checkGraphiti(): Promise<SetupItem> {
  const graphitiUrl = process.env.GRAPHITI_URL || 'http://91.99.27.146:8000';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${graphitiUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        name: 'Memory (Graphiti)',
        status: 'ok',
        message: `Connected to ${graphitiUrl}`,
      };
    }

    return {
      name: 'Memory (Graphiti)',
      status: 'warning',
      message: `Server responded with ${response.status}`,
      howToFix: 'Check if Graphiti server is running correctly',
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    return {
      name: 'Memory (Graphiti)',
      status: 'warning',
      message: isAbort ? 'Connection timeout' : 'Cannot connect',
      howToFix: 'Zosia works without memory, but set GRAPHITI_URL if you have a server',
    };
  }
}

/**
 * Check model configuration
 */
export function checkModel(): SetupItem {
  const config = loadConfig();
  const model = config.consciousMind?.model;

  if (model) {
    const isFree = model.includes(':free');
    return {
      name: 'Model',
      status: 'ok',
      message: `${model}${isFree ? ' (free)' : ''}`,
    };
  }

  return {
    name: 'Model',
    status: 'warning',
    message: 'Using default model',
    howToFix: 'Run /onboarding model to choose a model',
  };
}

/**
 * Check user identity
 */
export function checkUserIdentity(): SetupItem {
  const configPath = join(homedir(), '.zosia', 'config.json');

  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.userName) {
        return {
          name: 'User Identity',
          status: 'ok',
          message: `Hello, ${config.userName}!`,
        };
      }
    } catch {
      // Ignore
    }
  }

  return {
    name: 'User Identity',
    status: 'warning',
    message: 'Name not set',
    howToFix: 'Run: zosia setup',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Status Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get full onboarding status
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const items: SetupItem[] = [
    checkNodeVersion(),
    checkOpenRouterKey(),
    await checkClaudeCode(),
    await checkGraphiti(),
    checkModel(),
    checkUserIdentity(),
  ];

  const readyCount = items.filter((i) => i.status === 'ok').length;

  return {
    items,
    overallReady: readyCount >= 3, // At minimum need Node, OpenRouter, and Claude
    readyCount,
    totalCount: items.length,
  };
}

/**
 * Format onboarding status as displayable text
 */
export function formatOnboardingStatus(status: OnboardingStatus): string {
  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('              ✧ ZOSIA SETUP STATUS ✧');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');

  // Overall status
  const percent = Math.round((status.readyCount / status.totalCount) * 100);
  const bar = '█'.repeat(Math.round(percent / 10)) + '░'.repeat(10 - Math.round(percent / 10));
  lines.push(`Setup Progress: [${bar}] ${percent}% (${status.readyCount}/${status.totalCount})`);
  lines.push('');

  // Individual items
  for (const item of status.items) {
    const icon = item.status === 'ok' ? '✓' : item.status === 'warning' ? '⚠' : '✗';
    const color = item.status === 'ok' ? 'green' : item.status === 'warning' ? 'yellow' : 'red';

    lines.push(`${icon} ${item.name}`);
    lines.push(`  ${item.message}`);

    if (item.howToFix) {
      lines.push(`  → ${item.howToFix}`);
    }
    lines.push('');
  }

  // Footer with next steps
  if (!status.overallReady) {
    lines.push('───────────────────────────────────────────────────────');
    lines.push('NEXT STEPS:');
    const missing = status.items.filter((i) => i.status === 'missing');
    const warnings = status.items.filter((i) => i.status === 'warning');

    if (missing.length > 0) {
      lines.push(`  Fix ${missing.length} missing item(s) marked with ✗`);
    }
    if (warnings.length > 0) {
      lines.push(`  Optional: Fix ${warnings.length} warning(s) marked with ⚠`);
    }
  } else {
    lines.push('───────────────────────────────────────────────────────');
    lines.push('✓ Zosia is ready! Start chatting.');
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set OpenRouter key interactively
 */
export async function setOpenRouterKeyFromInput(key: string): Promise<{ success: boolean; message: string }> {
  if (!key) {
    return { success: false, message: 'No key provided. Usage: /onboarding openrouter YOUR_KEY' };
  }

  if (!key.startsWith('sk-or-')) {
    return { success: false, message: 'Invalid key format. OpenRouter keys start with sk-or-' };
  }

  try {
    const success = await setOpenRouterKey(key);
    if (success) {
      return { success: true, message: '✓ OpenRouter key saved and validated!' };
    }
    return { success: false, message: 'Key validation failed. Check your key and try again.' };
  } catch (error) {
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * List available models for selection
 */
export function getRecommendedModels(): Array<{ id: string; name: string; cost: string }> {
  return [
    { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B', cost: 'Free' },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', cost: 'Free' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', cost: '$0.25/1M' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', cost: '$3/1M' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', cost: '$0.15/1M' },
  ];
}

/**
 * Set model from selection
 */
export async function setModelFromInput(modelId: string): Promise<{ success: boolean; message: string }> {
  if (!modelId) {
    const models = getRecommendedModels();
    const list = models.map((m, i) => `  ${i + 1}. ${m.name} (${m.cost})`).join('\n');
    return {
      success: false,
      message: `Available models:\n${list}\n\nUsage: /onboarding model MODEL_ID`,
    };
  }

  try {
    await setConsciousMindModel(modelId);
    return { success: true, message: `✓ Model set to: ${modelId}` };
  } catch (error) {
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  if (!key || key.length < 10) return '***';
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}
