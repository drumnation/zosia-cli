#!/usr/bin/env node
/**
 * Zosia CLI - I/We Dual-Layer Architecture
 *
 * Usage:
 *   pnpm zosia "Hello"           # Basic chat
 *   pnpm zosia "Hello" --debug   # See I/We layer activity
 *   pnpm zosia "Hello" --user=ben # Use Ben's memory
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import updateNotifier from 'update-notifier';
import { createRequire } from 'module';

// Check for updates (runs async in background, notifies on next run)
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 }).notify({ isGlobal: true });
import { resolve } from 'path';
import readline from 'readline';
import { chat, getSession, clearSession } from './orchestrator.js';
import { launchInteractive } from './interactive.js';
import {
  parseAttachments,
  getImageAttachments,
  hasImages,
  type ImageContent,
} from './attachments.js';
import {
  initWeLayerPool,
  shutdownWeLayerPool,
  detectClaudeCodeAuth,
  refreshClaudeCodeStatus,
  getClaudeCodeStatusSummary,
  getGraphitiStatus,
  getGraphitiStatusAsync,
} from './we-layer.js';
import {
  login as authLogin,
  logout as authLogout,
  getSession as getAuthSession,
  getCurrentUser,
  isAuthenticated,
} from './auth.js';
import {
  loadConfig,
  getPreferredProvider,
  setPreferredProvider,
  setOpenAIKey,
  clearOpenAIKey,
  getConfigSummary,
  setOpenRouterKey,
  clearOpenRouterKey,
  getConsciousMindConfig,
  setConsciousMindModel,
  setConsciousMindTemperature,
  setConsciousMindMaxTokens,
  getCustomPrompts,
  setCustomPrompt,
  clearCustomPrompt,
  clearAllCustomPrompts,
  getCostTracking,
  resetCostTracking,
  resetToDefaults,
  getCachedModels,
  clearModelCache,
} from './config.js';
import {
  fetchOpenRouterModels,
  filterConversationalModels,
  filterFreeModels,
  sortModelsByCost,
  formatModelDisplay,
  RECOMMENDED_CONSCIOUS_MODELS,
  DEFAULT_CONSCIOUS_MODEL,
} from './model-service.js';

// Load .env from project root (two levels up from packages/zosia-cli/src)
config({ path: resolve(import.meta.dirname, '../../../.env') });

/**
 * Handle non-interactive print mode (-p flag)
 * Sends a single message and prints the response
 */
async function handlePrintMode(message: string, options: {
  debug?: boolean;
  user?: string;
  clear?: boolean;
  stream?: boolean;
}) {
  const { debug, clear, stream } = options;

  // Determine user ID: explicit flag > authenticated user > default
  let user = options.user;
  if (!user) {
    const authSession = getAuthSession();
    user = authSession?.userId || 'anonymous';
    if (debug && authSession) {
      console.log(chalk.gray(`Using authenticated user: ${authSession.email}`));
    }
  }

  // Set debug env for we-layer visibility
  if (debug) {
    process.env.ZOSIA_DEBUG = 'true';
  }

  // Banner
  if (debug) {
    console.log(chalk.magenta('\n╔═══════════════════════════════════════════════════════╗'));
    console.log(chalk.magenta('║') + chalk.white.bold(`  ZOSIA v${pkg.version} DEBUG MODE - I/We Layer Visible  `) + chalk.magenta('    ║'));
    console.log(chalk.magenta('╚═══════════════════════════════════════════════════════╝'));
  }

  // Initialize We-layer pool (pre-warm Claude agents)
  await initWeLayerPool(debug);

  // Clear session if requested
  if (clear) {
    clearSession(user);
    if (debug) {
      console.log(chalk.yellow(`\n⟳ Session cleared for user: ${user}`));
    }
  }

  try {
    // Parse attachments from message
    const { attachments, cleanedText } = parseAttachments(message);
    const fileAttachments = attachments.filter(a => a.type === 'file' && a.exists);

    // Load image attachments for vision models
    let imageContents: ImageContent[] = [];
    const imageAttachments = fileAttachments.filter(a => a.isImage);

    if (imageAttachments.length > 0) {
      if (debug) {
        console.log(chalk.blue(`\n🖼️  Loading ${imageAttachments.length} image(s)...`));
      }
      imageContents = await getImageAttachments(imageAttachments);
      if (debug && imageContents.length > 0) {
        for (const img of imageContents) {
          const sizeMB = (img.sizeBytes / (1024 * 1024)).toFixed(2);
          console.log(chalk.gray(`   • ${img.path} (${sizeMB} MB)`));
        }
      }
    }

    // Run the dual-layer chat with images
    const turn = await chat(cleanedText || message, {
      userId: user,
      debug,
      stream,
      images: imageContents.length > 0 ? imageContents : undefined,
    });

    // Output response
    console.log(chalk.cyan('\n┌─ ZOSIA ─────────────────────────────────────────────────┐'));

    // Format response with proper wrapping
    const response = turn.response;
    const lines = wrapText(response, 58);
    for (const line of lines) {
      console.log(chalk.cyan('│ ') + line);
    }

    console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));

    // Debug summary
    if (debug && turn.debug) {
      console.log(chalk.gray('\n─── DEBUG SUMMARY ───'));
      console.log(chalk.gray(`Total Latency: ${turn.debug.iLayer.latencyMs + (turn.debug.weLayer?.latencyMs || 0)}ms`));
      console.log(chalk.gray(`I-Layer: ${turn.debug.iLayer.latencyMs}ms (${turn.debug.iLayer.model})`));
      if (turn.debug.weLayer) {
        console.log(chalk.gray(`We-Layer: ${turn.debug.weLayer.latencyMs}ms (${turn.debug.weLayer.associationsDistilled} associations)`));
      }
      console.log(chalk.gray(`Session turns: ${turn.debug.mindstateVersion}`));
    }

  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : error);

    if (error instanceof Error && error.message.includes('OPENROUTER')) {
      console.log(chalk.yellow('\n💡 Tip: Add OPENROUTER_API_KEY to your .env file'));
      console.log(chalk.gray('   Get a key at: https://openrouter.ai/keys'));
    }

    process.exit(1);
  }
}

const program = new Command();

program
  .name('zosia')
  .description('Zosia AI Companion - starts interactive TUI by default, use -p/--print for non-interactive output')
  .version(pkg.version)
  .argument('[prompt]', 'Your prompt (use with -p for non-interactive mode)')
  .option('-p, --print', 'Print response and exit (non-interactive mode, useful for pipes)')
  .option('-d, --debug', 'Show internal I/We layer activity')
  .option('-u, --user <id>', 'User ID for memory isolation')
  .option('--clear', 'Clear session before processing');

// Setup command - first-time configuration
program
  .command('setup')
  .description('First-time setup wizard - configure Zosia for your use')
  .action(async () => {
    const { spawn } = await import('child_process');
    const { join } = await import('path');
    const setupPath = join(import.meta.dirname, 'setup.ts');

    const child = spawn('npx', ['tsx', setupPath], {
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      process.exit(code ?? 0);
    });
  });

// Interactive TUI - Dashboard mode with full visibility
program
  .command('tui')
  .alias('i')
  .description('Launch interactive dashboard TUI (development mode)')
  .option('-v, --verbose', 'Start in verbose mode (default: true)', true)
  .option('-n, --normal', 'Start in normal/clean mode')
  .option('-u, --user <id>', 'User ID for memory isolation')
  .action(async (options) => {
    const verbose = options.normal ? false : options.verbose;
    const userId = options.user;

    await launchInteractive({ userId, verbose });
  });

// Interactive chat command - REPL-style conversation (legacy readline)
program
  .command('chat')
  .description('Start an interactive chat session with Zosia (readline mode)')
  .option('-d, --debug', 'Show internal I/We layer activity')
  .option('-u, --user <id>', 'User ID for memory isolation')
  .action(async (options) => {
    const { debug } = options;

    // Determine user ID
    let user = options.user;
    if (!user) {
      const authSession = getAuthSession();
      user = authSession?.userId || 'anonymous';
    }

    // Set debug env
    if (debug) {
      process.env.ZOSIA_DEBUG = 'true';
    }

    // Banner
    console.log(chalk.magenta(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║               ${chalk.bold('Welcome to Zosia')} ${chalk.gray(`v${pkg.version}`)}                        ║
║                                                               ║
║        Your AI companion with memory and continuity           ║
║                                                               ║
║   Type your message and press Enter. Commands:                ║
║   ${chalk.gray('/exit')} - End conversation    ${chalk.gray('/clear')} - Clear session         ║
║   ${chalk.gray('/status')} - Check systems     ${chalk.gray('/debug')} - Toggle debug          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

    // Initialize We-layer
    console.log(chalk.gray('Initializing...'));
    await initWeLayerPool(debug);

    // Check Graphiti
    const graphiti = await getGraphitiStatusAsync();
    if (graphiti.healthy) {
      console.log(chalk.green(`✓ Memory connected (${graphiti.latencyMs}ms)`));
    } else {
      console.log(chalk.yellow('⚠ Memory offline - running without persistence'));
    }

    // Create readline interface with history
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('\nYou: '),
      historySize: 100,
    });

    let debugMode = debug;
    let isProcessing = false;

    // Spinner frames
    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinnerIndex = 0;
    let spinnerInterval: NodeJS.Timeout | null = null;

    const startSpinner = (message: string) => {
      spinnerIndex = 0;
      spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${chalk.cyan(spinnerFrames[spinnerIndex])} ${chalk.gray(message)}`);
        spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
      }, 80);
    };

    const stopSpinner = () => {
      if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
        process.stdout.write('\r\x1b[K'); // Clear line
      }
    };

    // Handle input
    rl.on('line', async (line) => {
      const input = line.trim();

      // Skip empty input
      if (!input) {
        rl.prompt();
        return;
      }

      // Handle commands
      if (input.startsWith('/')) {
        const cmd = input.toLowerCase();

        if (cmd === '/exit' || cmd === '/quit' || cmd === '/q') {
          console.log(chalk.magenta('\n💜 Goodbye! Your memories are saved.\n'));
          await shutdownWeLayerPool();
          rl.close();
          process.exit(0);
        }

        if (cmd === '/clear') {
          clearSession(user);
          console.log(chalk.green('✓ Session cleared'));
          rl.prompt();
          return;
        }

        if (cmd === '/status') {
          const claudeStatus = detectClaudeCodeAuth();
          const graphitiStatus = await getGraphitiStatusAsync();
          console.log(chalk.cyan('\n─── Status ───'));
          console.log(`Conscious: ${chalk.green('Ready')} | Unconscious: ${claudeStatus.authenticated ? chalk.green(claudeStatus.mode) : chalk.yellow('Not auth')} | Memory: ${graphitiStatus.healthy ? chalk.green('Connected') : chalk.yellow('Offline')}`);
          rl.prompt();
          return;
        }

        if (cmd === '/debug') {
          debugMode = !debugMode;
          process.env.ZOSIA_DEBUG = debugMode ? 'true' : '';
          console.log(chalk.gray(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`));
          rl.prompt();
          return;
        }

        if (cmd === '/help' || cmd === '/?') {
          console.log(chalk.cyan('\n─── Commands ───'));
          console.log('/exit, /quit, /q  - End conversation');
          console.log('/clear            - Clear session history');
          console.log('/status           - Check system status');
          console.log('/debug            - Toggle debug mode');
          console.log('/help, /?         - Show this help');
          rl.prompt();
          return;
        }

        console.log(chalk.yellow(`Unknown command: ${input}. Type /help for commands.`));
        rl.prompt();
        return;
      }

      // Prevent concurrent requests
      if (isProcessing) {
        console.log(chalk.yellow('Still processing previous message...'));
        return;
      }

      isProcessing = true;
      startSpinner('Thinking...');

      try {
        const turn = await chat(input, {
          userId: user,
          debug: debugMode,
          stream: false,
        });

        stopSpinner();

        // Display response
        console.log(chalk.magenta('\nZosia: ') + turn.response);

        // Debug info
        if (debugMode && turn.debug) {
          console.log(chalk.gray(`\n[${turn.debug.iLayer.latencyMs}ms I-Layer | ${turn.debug.weLayer?.latencyMs || 0}ms We-Layer | ${turn.debug.weLayer?.associationsDistilled || 0} associations]`));
        }

      } catch (error) {
        stopSpinner();
        console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : error);

        if (error instanceof Error && error.message.includes('OPENROUTER')) {
          console.log(chalk.yellow('💡 Set OPENROUTER_API_KEY or run: zosia setup'));
        }
      }

      isProcessing = false;
      rl.prompt();
    });

    // Handle Ctrl+C gracefully
    rl.on('SIGINT', async () => {
      stopSpinner();
      console.log(chalk.magenta('\n\n💜 Goodbye! Your memories are saved.\n'));
      await shutdownWeLayerPool();
      rl.close();
      process.exit(0);
    });

    // Handle close
    rl.on('close', async () => {
      await shutdownWeLayerPool();
      process.exit(0);
    });

    // Start the prompt
    rl.prompt();
  });

// Status command - show system health
program
  .command('status')
  .description('Show Zosia system status (conscious, unconscious, memory)')
  .action(async () => {
    console.log(chalk.cyan('\n┌─ Zosia System Status ─────────────────────────────────┐'));

    // Conscious Mind (OpenRouter)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      console.log(chalk.cyan('│ ') + chalk.green('✓ Conscious Mind (OpenRouter): Ready'));
      const consciousConfig = getConsciousMindConfig();
      console.log(chalk.cyan('│   ') + chalk.gray(`Model: ${consciousConfig.model}`));
    } else {
      console.log(chalk.cyan('│ ') + chalk.yellow('⚠️ Conscious Mind: No OPENROUTER_API_KEY'));
    }

    // Unconscious Mind (Claude Code)
    const claudeStatus = detectClaudeCodeAuth();
    if (claudeStatus.authenticated) {
      const modeLabel = claudeStatus.mode === 'max' ? 'Max Mode' : 'API Mode';
      console.log(chalk.cyan('│ ') + chalk.green(`✓ Unconscious Mind (Claude Code): ${modeLabel}`));
    } else {
      console.log(chalk.cyan('│ ') + chalk.yellow(`⚠️ Unconscious Mind: ${claudeStatus.error || 'Not authenticated'}`));
    }

    // Memory (Graphiti) - do live check
    console.log(chalk.cyan('│ ') + chalk.gray('Checking Graphiti...'));
    const graphiti = await getGraphitiStatusAsync();
    // Move cursor up and overwrite
    process.stdout.write('\x1b[1A\x1b[2K');
    if (graphiti.healthy) {
      console.log(chalk.cyan('│ ') + chalk.green(`✓ Memory (Graphiti): Connected (${graphiti.latencyMs}ms)`));
    } else {
      console.log(chalk.cyan('│ ') + chalk.yellow('⚠️ Memory (Graphiti): Not connected'));
    }

    console.log(chalk.cyan('└────────────────────────────────────────────────────────┘'));
  });

// Help topics
program
  .command('help-topic')
  .description('Get help on specific topics')
  .argument('<topic>', 'Topic: architecture, conscious, unconscious, memory, models')
  .action(async (topic: string) => {
    const topics: Record<string, string> = {
      architecture: `
Zosia uses a dual-consciousness architecture:

  I-Layer (Conscious Mind)     We-Layer (Unconscious Mind)
  ─────────────────────────    ────────────────────────────
  OpenRouter models            Claude Code agents
  User-facing responses        Memory retrieval
  Personality layer            Emotion classification
  Configurable model           Intent recognition
                               Pattern matching

The orchestrator runs both layers in PARALLEL, then merges
insights from the unconscious into the conscious response.
`,
      conscious: `
The Conscious Mind (I-Layer) handles direct responses:

  - Uses OpenRouter for model access
  - Configurable model: zosia config model <model-id>
  - Temperature control: zosia config temperature <0-2>
  - Custom prompts: zosia config prompt conscious

Default model: google/gemma-2-9b-it:free (free!)
`,
      unconscious: `
The Unconscious Mind (We-Layer) provides deeper insights:

  - Uses Claude Code with isolated configuration
  - Runs parallel agents for:
    • Memory retrieval
    • Emotion classification
    • Intent recognition
  - Results feed into conscious response

Enable deep processing:
  zosia config deep-unconscious --enable
`,
      memory: `
Memory is stored in Graphiti (temporal knowledge graph):

  - Server: 91.99.27.146:8000 (or set GRAPHITI_URL)
  - Stores conversation history
  - Extracts facts and entities
  - Enables continuity across sessions

Memory groups:
  - zosia-core: System identity
  - zosia-{userId}: User-specific memories
  - zosia-{userId}-sessions: Session summaries
`,
      models: `
Available conscious mind models (via OpenRouter):

Free Models:
  - google/gemma-2-9b-it:free     Best free option
  - meta-llama/llama-3-8b:free    Good alternative

Paid Models:
  - anthropic/claude-3-haiku      Fast, affordable
  - anthropic/claude-3.5-sonnet   High quality

Browse all: zosia config models
Set model: zosia config model <model-id>
`,
    };

    const content = topics[topic.toLowerCase()];
    if (content) {
      console.log(chalk.cyan(`\n─ ${topic.toUpperCase()} ────────────────────────────────────────`));
      console.log(content);
    } else {
      console.log(chalk.yellow(`Unknown topic: ${topic}`));
      console.log(chalk.gray('Available: architecture, conscious, unconscious, memory, models'));
    }
  });

// History command
program
  .command('history')
  .description('Show conversation history for a user')
  .option('-u, --user <id>', 'User ID', 'dave')
  .action((options) => {
    const session = getSession(options.user);

    if (!session || session.turns.length === 0) {
      console.log(chalk.yellow('No conversation history found.'));
      return;
    }

    console.log(chalk.cyan(`\n─── History for ${options.user} (${session.turns.length} turns) ───\n`));

    for (const turn of session.turns) {
      console.log(chalk.gray(`[${turn.timestamp.toISOString()}]`));
      console.log(chalk.white(`You: ${turn.userMessage}`));
      console.log(chalk.cyan(`Zosia: ${turn.response.slice(0, 100)}...`));
      console.log();
    }
  });

// Clear command
program
  .command('clear')
  .description('Clear session history for a user')
  .option('-u, --user <id>', 'User ID', 'dave')
  .action((options) => {
    clearSession(options.user);
    console.log(chalk.green(`✓ Session cleared for ${options.user}`));
  });

// Login command
program
  .command('login')
  .description('Login with your Appwrite account')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password (not recommended, will prompt if not provided)')
  .action(async (options) => {
    // Check if already logged in
    if (isAuthenticated()) {
      const session = getAuthSession();
      console.log(chalk.yellow(`Already logged in as ${session?.email}`));
      console.log(chalk.gray('Use "zosia logout" to sign out first.'));
      return;
    }

    let email = options.email;
    let password = options.password;

    // Prompt for email if not provided
    if (!email) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      email = await new Promise<string>((resolve) => {
        rl.question(chalk.cyan('Email: '), (answer) => {
          resolve(answer);
          rl.close();
        });
      });
    }

    // Prompt for password if not provided (hidden input)
    if (!password) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Disable echo for password
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }

      password = await new Promise<string>((resolve) => {
        let pwd = '';
        process.stdout.write(chalk.cyan('Password: '));

        process.stdin.on('data', (char) => {
          const c = char.toString();
          if (c === '\r' || c === '\n') {
            process.stdout.write('\n');
            if (process.stdin.isTTY) {
              process.stdin.setRawMode(false);
            }
            process.stdin.removeAllListeners('data');
            rl.close();
            resolve(pwd);
          } else if (c === '\x03') {
            // Ctrl+C
            process.exit();
          } else if (c === '\x7f' || c === '\b') {
            // Backspace
            if (pwd.length > 0) {
              pwd = pwd.slice(0, -1);
              process.stdout.write('\b \b');
            }
          } else {
            pwd += c;
            process.stdout.write('*');
          }
        });
      });
    }

    console.log(chalk.gray('\nAuthenticating...'));

    const result = await authLogin(email, password);

    if (result) {
      console.log(chalk.green(`\n✓ Welcome, ${result.name || result.email}!`));
      console.log(chalk.gray(`  User ID: ${result.userId}`));
      console.log(chalk.gray(`  Your memories are now isolated to your account.`));
    } else {
      console.error(chalk.red('\n✗ Login failed. Please check your credentials.'));
      process.exit(1);
    }
  });

// Logout command
program
  .command('logout')
  .description('Sign out of your account')
  .action(async () => {
    const session = getAuthSession();

    if (!session) {
      console.log(chalk.yellow('Not logged in.'));
      return;
    }

    await authLogout();
    console.log(chalk.green(`✓ Logged out successfully.`));
    console.log(chalk.gray(`  Goodbye, ${session.email}!`));
  });

// Whoami command
program
  .command('whoami')
  .description('Show current authenticated user')
  .action(async () => {
    const session = getAuthSession();

    if (!session) {
      console.log(chalk.yellow('Not logged in.'));
      console.log(chalk.gray('Use "zosia login" to authenticate.'));
      return;
    }

    console.log(chalk.cyan('\n┌─ Current User ─────────────────────────────────────────┐'));
    console.log(chalk.cyan('│ ') + chalk.white(`Name:    ${session.name || 'N/A'}`));
    console.log(chalk.cyan('│ ') + chalk.white(`Email:   ${session.email}`));
    console.log(chalk.cyan('│ ') + chalk.white(`User ID: ${session.userId}`));
    console.log(chalk.cyan('│ ') + chalk.gray(`Expires: ${new Date(session.expiresAt).toLocaleString()}`));
    console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));

    // Verify session is still valid
    const user = await getCurrentUser();
    if (!user) {
      console.log(chalk.yellow('\n⚠️  Session has expired. Please login again.'));
    }
  });

// Config command - embedding provider settings
const configCommand = program
  .command('config')
  .description('Manage Zosia settings (embedding provider, API keys)');

// Show current config
configCommand
  .command('show')
  .description('Show current configuration')
  .action(() => {
    console.log(chalk.cyan('\n┌─ Zosia Configuration ──────────────────────────────────┐'));
    const summary = getConfigSummary();
    for (const line of summary.split('\n')) {
      console.log(chalk.cyan('│ ') + chalk.white(line));
    }
    console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));
    console.log(chalk.gray('\nCommands:'));
    console.log(chalk.gray('  zosia config provider <jina|openai>  Set embedding provider'));
    console.log(chalk.gray('  zosia config openai-key <key>        Set OpenAI API key'));
    console.log(chalk.gray('  zosia config openai-key --clear      Remove OpenAI key'));
  });

// Set provider
configCommand
  .command('provider')
  .description('Set preferred embedding provider')
  .argument('<provider>', 'Provider name: jina (free) or openai (requires key)')
  .action(async (provider: string) => {
    const normalizedProvider = provider.toLowerCase();

    if (normalizedProvider !== 'jina' && normalizedProvider !== 'openai') {
      console.error(chalk.red(`\n✗ Invalid provider: ${provider}`));
      console.log(chalk.gray('  Valid options: jina (free), openai (requires API key)'));
      process.exit(1);
    }

    if (normalizedProvider === 'openai') {
      const config = loadConfig();
      if (!config.openaiApiKey || !config.openaiKeyValid) {
        console.error(chalk.red('\n✗ Cannot use OpenAI without a valid API key.'));
        console.log(chalk.gray('  Set your key first: zosia config openai-key <your-key>'));
        process.exit(1);
      }
    }

    await setPreferredProvider(normalizedProvider as 'jina' | 'openai');
    console.log(chalk.green(`\n✓ Embedding provider set to: ${normalizedProvider}`));

    if (normalizedProvider === 'jina') {
      console.log(chalk.gray('  Using free Jina AI embeddings (no API key required)'));
    } else {
      console.log(chalk.gray('  Using OpenAI embeddings (text-embedding-3-small)'));
    }
  });

// Set/clear OpenAI key
configCommand
  .command('openai-key')
  .description('Set or clear OpenAI API key')
  .argument('[key]', 'Your OpenAI API key (omit to be prompted)')
  .option('--clear', 'Remove stored OpenAI API key')
  .action(async (key: string | undefined, options) => {
    // Clear key
    if (options.clear) {
      await clearOpenAIKey();
      console.log(chalk.green('\n✓ OpenAI API key removed.'));
      console.log(chalk.gray('  Switched to free Jina embeddings.'));
      return;
    }

    // Prompt for key if not provided
    let apiKey = key;
    if (!apiKey) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      apiKey = await new Promise<string>((resolve) => {
        rl.question(chalk.cyan('OpenAI API Key: '), (answer) => {
          resolve(answer.trim());
          rl.close();
        });
      });
    }

    if (!apiKey) {
      console.error(chalk.red('\n✗ No API key provided.'));
      process.exit(1);
    }

    console.log(chalk.gray('\nValidating API key...'));

    const success = await setOpenAIKey(apiKey);

    if (success) {
      console.log(chalk.green('\n✓ OpenAI API key saved and validated!'));
      console.log(chalk.gray('  Switched to OpenAI embeddings (text-embedding-3-small)'));
      console.log(chalk.gray('  Your key is stored locally in ~/.zosia/config.json'));
    } else {
      console.error(chalk.red('\n✗ Invalid API key.'));
      console.log(chalk.gray('  The key was rejected by OpenAI. Please check it and try again.'));
      console.log(chalk.gray('  Get a key at: https://platform.openai.com/api-keys'));
      process.exit(1);
    }
  });

// Set/clear OpenRouter key
configCommand
  .command('openrouter-key')
  .description('Set or clear OpenRouter API key')
  .argument('[key]', 'Your OpenRouter API key (omit to be prompted)')
  .option('--clear', 'Remove stored OpenRouter API key')
  .action(async (key: string | undefined, options) => {
    // Clear key
    if (options.clear) {
      await clearOpenRouterKey();
      console.log(chalk.green('\n✓ OpenRouter API key removed.'));
      console.log(chalk.gray('  Will use OPENROUTER_API_KEY from environment if set.'));
      return;
    }

    // Prompt for key if not provided
    let apiKey = key;
    if (!apiKey) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      apiKey = await new Promise<string>((resolve) => {
        rl.question(chalk.cyan('OpenRouter API Key: '), (answer) => {
          resolve(answer.trim());
          rl.close();
        });
      });
    }

    if (!apiKey) {
      console.error(chalk.red('\n✗ No API key provided.'));
      process.exit(1);
    }

    console.log(chalk.gray('\nValidating API key...'));

    const success = await setOpenRouterKey(apiKey);

    if (success) {
      console.log(chalk.green('\n✓ OpenRouter API key saved and validated!'));
      console.log(chalk.gray('  Your key is stored locally in ~/.zosia/config.json'));
    } else {
      console.error(chalk.red('\n✗ Invalid API key.'));
      console.log(chalk.gray('  The key was rejected by OpenRouter. Please check it and try again.'));
      console.log(chalk.gray('  Get a key at: https://openrouter.ai/keys'));
      process.exit(1);
    }
  });

// List available models
configCommand
  .command('models')
  .description('List available models from OpenRouter')
  .option('--free', 'Show only free models')
  .option('--recommended', 'Show recommended models for Zosia')
  .option('--refresh', 'Refresh model cache from API')
  .action(async (options) => {
    if (options.recommended) {
      console.log(chalk.cyan('\n┌─ Recommended Models for Zosia ─────────────────────────┐'));
      for (const modelId of RECOMMENDED_CONSCIOUS_MODELS) {
        const isDefault = modelId === DEFAULT_CONSCIOUS_MODEL;
        const prefix = isDefault ? chalk.green('★ ') : '  ';
        console.log(chalk.cyan('│ ') + prefix + chalk.white(modelId) + (isDefault ? chalk.gray(' (default)') : ''));
      }
      console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));
      console.log(chalk.gray('\nUse: zosia config model <model-id> to set your conscious mind model'));
      return;
    }

    if (options.refresh) {
      clearModelCache();
      console.log(chalk.gray('Model cache cleared.'));
    }

    console.log(chalk.gray('\nFetching models from OpenRouter...'));

    try {
      const allModels = await getCachedModels();

      if (allModels.length === 0) {
        console.log(chalk.yellow('\n⚠️  Could not fetch models. Using recommended list.'));
        console.log(chalk.gray('   Run with --recommended to see curated models.'));
        return;
      }

      let models = filterConversationalModels(allModels);

      if (options.free) {
        models = filterFreeModels(models);
        console.log(chalk.cyan(`\n─── Free Models (${models.length}) ───\n`));
      } else {
        models = sortModelsByCost(models).slice(0, 30); // Top 30 cheapest
        console.log(chalk.cyan(`\n─── Models (sorted by cost, top 30) ───\n`));
      }

      for (const model of models) {
        console.log(formatModelDisplay(model));
      }

      console.log(chalk.gray(`\nTotal available: ${allModels.length} models`));
      console.log(chalk.gray('Use: zosia config model <model-id> to set your conscious mind model'));

    } catch (error) {
      console.error(chalk.red('\n✗ Failed to fetch models:'), error instanceof Error ? error.message : error);
    }
  });

// Set conscious mind model
configCommand
  .command('model')
  .description('Set the conscious mind model')
  .argument('[model-id]', 'Model ID from OpenRouter (e.g., google/gemma-2-9b-it)')
  .action(async (modelId: string | undefined) => {
    const currentConfig = getConsciousMindConfig();

    if (!modelId) {
      console.log(chalk.cyan('\n┌─ Current Conscious Mind Model ─────────────────────────┐'));
      console.log(chalk.cyan('│ ') + chalk.white(`Model: ${currentConfig.model}`));
      console.log(chalk.cyan('│ ') + chalk.white(`Temperature: ${currentConfig.temperature}`));
      console.log(chalk.cyan('│ ') + chalk.white(`Max Tokens: ${currentConfig.maxTokens}`));
      console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));
      console.log(chalk.gray('\nUsage:'));
      console.log(chalk.gray('  zosia config model <model-id>        Set model'));
      console.log(chalk.gray('  zosia config models                  List available models'));
      console.log(chalk.gray('  zosia config models --recommended    Show recommended models'));
      return;
    }

    await setConsciousMindModel(modelId);
    console.log(chalk.green(`\n✓ Conscious mind model set to: ${modelId}`));

    if (RECOMMENDED_CONSCIOUS_MODELS.includes(modelId)) {
      console.log(chalk.gray('  This is a recommended model for Zosia.'));
    } else {
      console.log(chalk.yellow('  ⚠️  This model is not in our recommended list.'));
      console.log(chalk.gray('     It may work, but quality is not guaranteed.'));
    }
  });

// Set temperature
configCommand
  .command('temperature')
  .description('Set the conscious mind temperature (0.0 - 2.0)')
  .argument('<value>', 'Temperature value')
  .action(async (value: string) => {
    const temp = parseFloat(value);

    if (isNaN(temp) || temp < 0 || temp > 2) {
      console.error(chalk.red('\n✗ Invalid temperature. Must be between 0.0 and 2.0.'));
      process.exit(1);
    }

    await setConsciousMindTemperature(temp);
    console.log(chalk.green(`\n✓ Temperature set to: ${temp}`));

    if (temp < 0.3) {
      console.log(chalk.gray('  (Very focused, deterministic responses)'));
    } else if (temp < 0.7) {
      console.log(chalk.gray('  (Balanced creativity and consistency)'));
    } else if (temp < 1.2) {
      console.log(chalk.gray('  (More creative, varied responses)'));
    } else {
      console.log(chalk.yellow('  (Very high - responses may be unpredictable)'));
    }
  });

// Set max tokens
configCommand
  .command('max-tokens')
  .description('Set the conscious mind max response tokens')
  .argument('<value>', 'Max tokens value')
  .action(async (value: string) => {
    const tokens = parseInt(value, 10);

    if (isNaN(tokens) || tokens < 50 || tokens > 16000) {
      console.error(chalk.red('\n✗ Invalid max tokens. Must be between 50 and 16000.'));
      process.exit(1);
    }

    await setConsciousMindMaxTokens(tokens);
    console.log(chalk.green(`\n✓ Max tokens set to: ${tokens}`));
  });

// Custom prompts
configCommand
  .command('prompt')
  .description('View or edit custom system prompts')
  .argument('[type]', 'Prompt type: conscious, subconscious, or identityKernel')
  .option('--edit', 'Edit the prompt (opens editor or reads from stdin)')
  .option('--clear', 'Clear custom prompt (use default)')
  .option('--clear-all', 'Clear all custom prompts')
  .action(async (type: string | undefined, options) => {
    // Clear all prompts
    if (options.clearAll) {
      await clearAllCustomPrompts();
      console.log(chalk.green('\n✓ All custom prompts cleared. Using defaults.'));
      return;
    }

    const validTypes = ['conscious', 'subconscious', 'identityKernel'] as const;
    const customPrompts = getCustomPrompts();

    // Show all prompts
    if (!type) {
      console.log(chalk.cyan('\n┌─ Custom Prompts ───────────────────────────────────────┐'));

      for (const t of validTypes) {
        const hasCustom = customPrompts?.[t];
        const status = hasCustom ? chalk.green('✓ custom') : chalk.gray('default');
        console.log(chalk.cyan('│ ') + chalk.white(`${t}: ${status}`));
      }

      console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));
      console.log(chalk.gray('\nUsage:'));
      console.log(chalk.gray('  zosia config prompt <type>          View prompt'));
      console.log(chalk.gray('  zosia config prompt <type> --edit   Edit prompt'));
      console.log(chalk.gray('  zosia config prompt <type> --clear  Clear custom prompt'));
      return;
    }

    // Validate type
    if (!validTypes.includes(type as typeof validTypes[number])) {
      console.error(chalk.red(`\n✗ Invalid prompt type: ${type}`));
      console.log(chalk.gray(`  Valid types: ${validTypes.join(', ')}`));
      process.exit(1);
    }

    const promptType = type as typeof validTypes[number];

    // Clear specific prompt
    if (options.clear) {
      await clearCustomPrompt(promptType);
      console.log(chalk.green(`\n✓ Custom ${promptType} prompt cleared. Using default.`));
      return;
    }

    // Edit prompt
    if (options.edit) {
      console.log(chalk.cyan(`\nEnter your custom ${promptType} prompt (Ctrl+D when done):\n`));

      const chunks: string[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk.toString());
      }
      const newPrompt = chunks.join('').trim();

      if (!newPrompt) {
        console.error(chalk.red('\n✗ Empty prompt provided.'));
        process.exit(1);
      }

      await setCustomPrompt(promptType, newPrompt);
      console.log(chalk.green(`\n✓ Custom ${promptType} prompt saved!`));
      console.log(chalk.gray(`  Length: ${newPrompt.length} characters`));
      return;
    }

    // View prompt
    const customPrompt = customPrompts?.[promptType];
    if (customPrompt) {
      console.log(chalk.cyan(`\n─── Custom ${promptType} Prompt ───\n`));
      console.log(customPrompt);
      console.log(chalk.gray(`\n─── (${customPrompt.length} characters) ───`));
    } else {
      console.log(chalk.gray(`\nNo custom ${promptType} prompt set. Using default.`));
      console.log(chalk.gray('Use --edit to set a custom prompt.'));
    }
  });

// Cost tracking
configCommand
  .command('costs')
  .description('View or reset cost tracking')
  .option('--reset', 'Reset cost tracking to zero')
  .action(async (options) => {
    if (options.reset) {
      resetCostTracking();
      console.log(chalk.green('\n✓ Cost tracking reset to zero.'));
      return;
    }

    const costs = getCostTracking();

    console.log(chalk.cyan('\n┌─ Cost Tracking ────────────────────────────────────────┐'));
    console.log(chalk.cyan('│ ') + chalk.white.bold('Embeddings'));
    console.log(chalk.cyan('│ ') + chalk.white(`  Total: ${costs.totalEmbeddingTokens.toLocaleString()} tokens`));
    console.log(chalk.cyan('│ ') + chalk.white(`  Cost: $${costs.totalEmbeddingCostUsd.toFixed(6)}`));
    console.log(chalk.cyan('│ ') + chalk.gray(`  Jina: ${costs.embeddingsByProvider.jina.tokens.toLocaleString()} tokens ($${costs.embeddingsByProvider.jina.cost.toFixed(6)})`));
    console.log(chalk.cyan('│ ') + chalk.gray(`  OpenAI: ${costs.embeddingsByProvider.openai.tokens.toLocaleString()} tokens ($${costs.embeddingsByProvider.openai.cost.toFixed(6)})`));
    console.log(chalk.cyan('│ '));
    console.log(chalk.cyan('│ ') + chalk.white.bold('LLM (Conscious Mind)'));
    console.log(chalk.cyan('│ ') + chalk.white(`  Input: ${costs.totalLlmInputTokens.toLocaleString()} tokens`));
    console.log(chalk.cyan('│ ') + chalk.white(`  Output: ${costs.totalLlmOutputTokens.toLocaleString()} tokens`));
    console.log(chalk.cyan('│ ') + chalk.white(`  Cost: $${costs.totalLlmCostUsd.toFixed(6)}`));

    // Show per-model breakdown if any
    const modelEntries = Object.entries(costs.llmCostsByModel);
    if (modelEntries.length > 0) {
      console.log(chalk.cyan('│ '));
      console.log(chalk.cyan('│ ') + chalk.gray('  By Model:'));
      for (const [model, data] of modelEntries) {
        console.log(chalk.cyan('│ ') + chalk.gray(`    ${model}: ${(data.inputTokens + data.outputTokens).toLocaleString()} tokens ($${data.cost.toFixed(6)})`));
      }
    }

    console.log(chalk.cyan('│ '));
    console.log(chalk.cyan('│ ') + chalk.white.bold('Summary'));
    const totalCost = costs.totalEmbeddingCostUsd + costs.totalLlmCostUsd;
    console.log(chalk.cyan('│ ') + chalk.white(`  Sessions: ${costs.sessionCount}`));
    console.log(chalk.cyan('│ ') + chalk.white(`  Total Cost: $${totalCost.toFixed(6)}`));
    console.log(chalk.cyan('│ ') + chalk.gray(`  Since: ${new Date(costs.lastReset).toLocaleDateString()}`));
    console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));
    console.log(chalk.gray('\nUse --reset to reset cost tracking.'));
  });

// Reset to defaults
configCommand
  .command('reset')
  .description('Reset all configuration to defaults')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    if (!options.confirm) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question(chalk.yellow('Reset all settings to defaults? API keys will be preserved. (y/N): '), (a) => {
          resolve(a.trim().toLowerCase());
          rl.close();
        });
      });

      if (answer !== 'y' && answer !== 'yes') {
        console.log(chalk.gray('Cancelled.'));
        return;
      }
    }

    resetToDefaults();
    console.log(chalk.green('\n✓ Configuration reset to defaults.'));
    console.log(chalk.gray('  API keys have been preserved.'));
    console.log(chalk.gray('  Run "zosia config show" to see current settings.'));
  });

// Claude Code status (unconscious layer)
configCommand
  .command('claude-code')
  .description('Check Claude Code authentication status (unconscious layer)')
  .option('--refresh', 'Force refresh of cached status')
  .option('--login', 'Launch Claude Code browser authentication')
  .action(async (options) => {
    if (options.refresh) {
      refreshClaudeCodeStatus();
      console.log(chalk.gray('Status refreshed.'));
    }

    const status = detectClaudeCodeAuth();
    const graphiti = getGraphitiStatus();

    console.log(chalk.cyan('\n┌─ We-Layer Status (Unconscious) ───────────────────────┐'));

    // Claude Code status
    if (status.authenticated) {
      const modeIcon = status.mode === 'max' ? '👤' : '🔑';
      const modeLabel = status.mode === 'max' ? 'Max Mode (Browser Auth)' : 'API Mode (ANTHROPIC_API_KEY)';
      console.log(chalk.cyan('│ ') + chalk.green(`${modeIcon} Claude Code: ${modeLabel}`));

      if (status.email) {
        console.log(chalk.cyan('│ ') + chalk.white(`   Email: ${status.email}`));
      }

      if (status.expiresAt) {
        const expiry = new Date(status.expiresAt);
        const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const expiryColor = daysLeft <= 7 ? chalk.yellow : chalk.gray;
        console.log(chalk.cyan('│ ') + expiryColor(`   Expires: ${expiry.toLocaleDateString()} (${daysLeft} days)`));
      }
    } else {
      console.log(chalk.cyan('│ ') + chalk.red('❌ Claude Code: Not authenticated'));
      console.log(chalk.cyan('│ ') + chalk.gray(`   ${status.error || 'Unknown error'}`));
    }

    console.log(chalk.cyan('│ '));

    // Graphiti status
    if (graphiti.healthy) {
      console.log(chalk.cyan('│ ') + chalk.green(`🧠 Graphiti: Connected (${graphiti.latencyMs}ms)`));
    } else {
      console.log(chalk.cyan('│ ') + chalk.yellow('⚠️  Graphiti: Not available (pattern fallback active)'));
    }

    console.log(chalk.cyan('└────────────────────────────────────────────────────────┘'));

    // Show help for authentication
    if (!status.authenticated) {
      console.log(chalk.gray('\nTo authenticate Claude Code:'));
      console.log(chalk.gray('  claude login          # Browser authentication (max mode)'));
      console.log(chalk.gray('  export ANTHROPIC_API_KEY=sk-...  # API key mode'));
    }

    // Launch login if requested
    if (options.login) {
      console.log(chalk.cyan('\nLaunching Claude Code authentication...'));
      const { spawn } = await import('child_process');

      const child = spawn('claude', ['login'], {
        stdio: 'inherit',
        shell: true,
      });

      child.on('close', (code) => {
        if (code === 0) {
          refreshClaudeCodeStatus();
          const newStatus = detectClaudeCodeAuth();
          if (newStatus.authenticated) {
            console.log(chalk.green('\n✓ Claude Code authenticated successfully!'));
            console.log(chalk.gray(`  Mode: ${newStatus.mode === 'max' ? 'Max Mode' : 'API Mode'}`));
          }
        } else {
          console.log(chalk.red('\n✗ Authentication failed or was cancelled.'));
        }
      });
    }
  });

// Default config action (show)
configCommand.action(() => {
  console.log(chalk.cyan('\n┌─ Zosia Configuration ──────────────────────────────────┐'));
  const summary = getConfigSummary();
  for (const line of summary.split('\n')) {
    console.log(chalk.cyan('│ ') + chalk.white(line));
  }
  console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));
  console.log(chalk.gray('\nCommands:'));
  console.log(chalk.gray('  zosia config provider <jina|openai>  Set embedding provider'));
  console.log(chalk.gray('  zosia config openai-key <key>        Set OpenAI API key'));
  console.log(chalk.gray('  zosia config openrouter-key <key>    Set OpenRouter API key'));
  console.log(chalk.gray('  zosia config model <model-id>        Set conscious mind model'));
  console.log(chalk.gray('  zosia config models                  List available models'));
  console.log(chalk.gray('  zosia config temperature <value>     Set temperature (0-2)'));
  console.log(chalk.gray('  zosia config max-tokens <value>      Set max response tokens'));
  console.log(chalk.gray('  zosia config prompt <type>           View/edit system prompts'));
  console.log(chalk.gray('  zosia config costs                   View cost tracking'));
  console.log(chalk.gray('  zosia config claude-code             Check unconscious layer status'));
  console.log(chalk.gray('  zosia config reset                   Reset to defaults'));
});

// Handle CLI execution
const knownCommands = ['setup', 'tui', 'i', 'chat', 'status', 'help-topic', 'history', 'clear', 'login', 'logout', 'whoami', 'config'];

// Check for -p/--print flag
const hasPrintFlag = process.argv.includes('-p') || process.argv.includes('--print');
const hasDebugFlag = process.argv.includes('-d') || process.argv.includes('--debug');
const hasClearFlag = process.argv.includes('--clear');

// Find -u/--user value
function findUserArg(): string | undefined {
  const uIndex = process.argv.indexOf('-u');
  const userIndex = process.argv.indexOf('--user');
  const idx = uIndex !== -1 ? uIndex : userIndex;
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

// Find the prompt argument (first non-flag, non-command arg)
function findPromptArg(): string | undefined {
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    // Skip flags and their values
    if (arg.startsWith('-')) {
      // Skip next arg if this is a flag that takes a value
      if (['-u', '--user'].includes(arg)) {
        i++;
      }
      continue;
    }
    // Skip known commands
    if (knownCommands.includes(arg)) {
      return undefined;
    }
    // Found the prompt
    return arg;
  }
  return undefined;
}

const firstArg = process.argv[2];
const isKnownCommand = firstArg && knownCommands.includes(firstArg);
const prompt = findPromptArg();

if (process.argv.length === 2) {
  // No args - launch TUI
  launchInteractive({ verbose: true });
} else if (hasPrintFlag && prompt) {
  // -p flag with prompt - non-interactive mode
  handlePrintMode(prompt, {
    debug: hasDebugFlag,
    user: findUserArg(),
    clear: hasClearFlag,
  });
} else if (hasPrintFlag && !prompt) {
  // -p flag without prompt - error
  console.error(chalk.red('Error: -p/--print requires a prompt argument'));
  console.log(chalk.gray('Usage: zosia -p "your message here"'));
  process.exit(1);
} else if (!isKnownCommand && firstArg && !firstArg.startsWith('-')) {
  // Bare prompt without -p flag - show helpful message
  console.log(chalk.yellow('💡 For non-interactive mode, use: zosia -p "' + firstArg + '"'));
  console.log(chalk.gray('   Or just run `zosia` to start the interactive TUI.\n'));
  process.exit(0);
} else {
  // Normal command parsing
  program.parse();
}

/**
 * Simple text wrapper
 */
function wrapText(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > width) {
      if (currentLine) {
        lines.push(currentLine.trim());
        currentLine = '';
      }
    }
    currentLine += word + ' ';
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
}
