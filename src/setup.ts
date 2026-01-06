#!/usr/bin/env tsx
/**
 * Zosia Setup Wizard
 *
 * First-time setup for new users. Guides through:
 * 1. User identity (name)
 * 2. OpenRouter API key (for conscious mind)
 * 3. Claude Code authentication (for unconscious mind)
 * 4. Graphiti connection test (for memory)
 * 5. First conversation!
 */

import chalk from 'chalk';
import { createInterface } from 'readline';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

// Config path
const CONFIG_DIR = join(homedir(), '.zosia');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface ZosiaConfig {
  userId: string;
  userName: string;
  openrouterKey?: string;
  graphitiUrl?: string;
  model?: string;
  temperature?: number;
  setupComplete: boolean;
  setupDate?: string;
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function askSecret(question: string): Promise<string> {
  // For secrets, we still use readline but warn about visibility
  console.log(chalk.dim('  (input will be visible - clear terminal after if needed)'));
  return ask(question);
}

function loadConfig(): ZosiaConfig | null {
  if (existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

function saveConfig(config: ZosiaConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function checkClaudeCode(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('claude', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

async function checkClaudeAuth(): Promise<{ authenticated: boolean; mode: string }> {
  const credPath = join(homedir(), '.claude', 'credentials.json');
  if (existsSync(credPath)) {
    try {
      const creds = JSON.parse(readFileSync(credPath, 'utf-8'));
      if (creds.accessToken) {
        const expired = creds.expiresAt && new Date(creds.expiresAt) < new Date();
        if (!expired) {
          return { authenticated: true, mode: 'max' };
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return { authenticated: true, mode: 'api' };
  }

  return { authenticated: false, mode: 'none' };
}

async function testGraphiti(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                     ${chalk.bold('Welcome to Zosia')}                        ║
║                                                               ║
║        Your AI companion with memory and continuity           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

  // Check for existing config
  const existingConfig = loadConfig();
  if (existingConfig?.setupComplete) {
    console.log(chalk.yellow(`Setup already complete for ${existingConfig.userName}.`));
    const redo = await ask('Would you like to reconfigure? (y/N): ');
    if (redo.toLowerCase() !== 'y') {
      console.log(chalk.green('\nRun `zosia chat` to start talking with Zosia!'));
      rl.close();
      return;
    }
  }

  console.log(chalk.dim('This wizard will help you set up Zosia.\n'));

  // Step 1: User Identity
  console.log(chalk.cyan.bold('Step 1: Your Identity'));
  console.log(chalk.dim('Zosia will remember you by name.\n'));

  const userName = await ask('What should Zosia call you? ');
  const userId = userName.toLowerCase().replace(/[^a-z0-9]/g, '-');

  console.log(chalk.green(`\nNice to meet you, ${userName}! 👋\n`));

  // Step 2: OpenRouter API Key
  console.log(chalk.cyan.bold('Step 2: Conscious Mind (OpenRouter)'));
  console.log(chalk.dim('Zosia uses OpenRouter for her conscious responses.'));
  console.log(chalk.dim('Get a free API key at: https://openrouter.ai/keys\n'));

  let openrouterKey = process.env.OPENROUTER_API_KEY || '';
  if (openrouterKey) {
    console.log(chalk.green('✓ OPENROUTER_API_KEY found in environment'));
  } else {
    openrouterKey = await askSecret('OpenRouter API key (or press Enter to skip): ');
  }

  if (!openrouterKey) {
    console.log(chalk.yellow('\n⚠️  No OpenRouter key - conscious responses will be disabled.'));
    console.log(chalk.dim('  Set OPENROUTER_API_KEY later or run `zosia config openrouter-key`\n'));
  } else {
    console.log(chalk.green('✓ OpenRouter configured\n'));
  }

  // Step 3: Claude Code (Unconscious)
  console.log(chalk.cyan.bold('Step 3: Unconscious Mind (Claude Code)'));
  console.log(chalk.dim('Zosia uses Claude Code for deeper processing and memory retrieval.\n'));

  const claudeInstalled = await checkClaudeCode();
  if (!claudeInstalled) {
    console.log(chalk.yellow('⚠️  Claude Code not installed.'));
    console.log(chalk.dim('  Install: npm install -g @anthropic-ai/claude-code'));
    console.log(chalk.dim('  Then run: claude login\n'));
  } else {
    console.log(chalk.green('✓ Claude Code installed'));

    const authStatus = await checkClaudeAuth();
    if (authStatus.authenticated) {
      const modeLabel = authStatus.mode === 'max' ? 'Max Mode (browser)' : 'API Mode';
      console.log(chalk.green(`✓ Claude Code authenticated: ${modeLabel}\n`));
    } else {
      console.log(chalk.yellow('⚠️  Claude Code not authenticated.'));
      const doLogin = await ask('Would you like to authenticate now? (Y/n): ');
      if (doLogin.toLowerCase() !== 'n') {
        console.log(chalk.dim('\nLaunching Claude Code login...\n'));
        const loginProc = spawn('claude', ['login'], { stdio: 'inherit' });
        await new Promise<void>((resolve) => {
          loginProc.on('close', () => resolve());
        });
        console.log('');
      }
    }
  }

  // Step 4: Graphiti (Memory)
  console.log(chalk.cyan.bold('Step 4: Memory (Graphiti)'));
  console.log(chalk.dim('Zosia stores memories in Graphiti for continuity.\n'));

  const defaultGraphiti = 'http://91.99.27.146:8000';
  let graphitiUrl = await ask(`Graphiti URL (Enter for ${defaultGraphiti}): `);
  graphitiUrl = graphitiUrl || defaultGraphiti;

  const graphitiOk = await testGraphiti(graphitiUrl);
  if (graphitiOk) {
    console.log(chalk.green('✓ Graphiti connected\n'));
  } else {
    console.log(chalk.yellow('⚠️  Could not connect to Graphiti.'));
    console.log(chalk.dim('  Zosia will work without memory persistence.\n'));
    graphitiUrl = '';
  }

  // Step 5: Model Selection
  console.log(chalk.cyan.bold('Step 5: Model Selection'));
  console.log(chalk.dim('Choose the model for Zosia\'s conscious responses.\n'));

  const models = [
    { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', cost: '$0' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', cost: '~$0.25/1M tokens' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', cost: '~$3/1M tokens' },
  ];

  console.log('Available models:');
  models.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name} - ${m.cost}`);
  });
  console.log('');

  const modelChoice = await ask('Choose (1-3, or Enter for Gemma 2 free): ');
  const modelIndex = parseInt(modelChoice) - 1;
  const selectedModel = models[modelIndex] || models[0];

  console.log(chalk.green(`✓ Using ${selectedModel.name}\n`));

  // Save config
  const config: ZosiaConfig = {
    userId,
    userName,
    openrouterKey: openrouterKey || undefined,
    graphitiUrl: graphitiUrl || undefined,
    model: selectedModel.id,
    temperature: 0.7,
    setupComplete: true,
    setupDate: new Date().toISOString(),
  };

  saveConfig(config);

  // Done!
  console.log(chalk.cyan.bold('Setup Complete! 🎉\n'));

  console.log(chalk.white('Configuration saved to: ') + chalk.dim(CONFIG_FILE));
  console.log('');

  console.log(chalk.cyan('What you can do now:'));
  console.log(chalk.white('  zosia chat           ') + chalk.dim('- Start chatting with Zosia'));
  console.log(chalk.white('  zosia config         ') + chalk.dim('- View/change configuration'));
  console.log(chalk.white('  zosia status         ') + chalk.dim('- Check system status'));
  console.log(chalk.white('  zosia help           ') + chalk.dim('- See all commands'));
  console.log('');

  // Offer first chat
  const startChat = await ask('Would you like to say hello to Zosia now? (Y/n): ');
  if (startChat.toLowerCase() !== 'n') {
    console.log(chalk.dim('\nStarting chat session...\n'));
    rl.close();

    // Launch chat
    const chatProc = spawn('npx', ['tsx', join(__dirname, 'cli.ts'), 'chat'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        OPENROUTER_API_KEY: openrouterKey || process.env.OPENROUTER_API_KEY,
        GRAPHITI_URL: graphitiUrl || process.env.GRAPHITI_URL,
      },
    });

    chatProc.on('close', () => {
      process.exit(0);
    });
  } else {
    console.log(chalk.green('\nSee you soon! Run `zosia chat` when you\'re ready. 💙\n'));
    rl.close();
  }
}

main().catch((error) => {
  console.error(chalk.red('Setup failed:'), error);
  rl.close();
  process.exit(1);
});
