/**
 * Slash Commands Module
 *
 * Parses and manages slash commands in the TUI.
 * Commands like /help, /clear, /save, /retry, /copy
 */

/** Slash command definition */
export interface SlashCommand {
  /** Command name (without slash) */
  name: string;
  /** Description for help text */
  description: string;
  /** Usage example */
  usage: string;
  /** Aliases for this command */
  aliases?: string[];
}

/** Parsed command result */
export interface ParsedCommand {
  /** Command name (lowercase, resolved from alias) */
  command: string;
  /** Command arguments */
  args: string[];
}

/** Command registry */
export const COMMANDS = new Map<string, SlashCommand>([
  [
    'help',
    {
      name: 'help',
      description: 'Show available commands or help for a specific command',
      usage: '/help [command]',
      aliases: ['?'],
    },
  ],
  [
    'clear',
    {
      name: 'clear',
      description: 'Clear the conversation history from display',
      usage: '/clear',
      aliases: ['cls'],
    },
  ],
  [
    'retry',
    {
      name: 'retry',
      description: 'Retry the last message with the same prompt',
      usage: '/retry',
    },
  ],
  [
    'save',
    {
      name: 'save',
      description: 'Save the current session to a file',
      usage: '/save <filename>',
    },
  ],
  [
    'load',
    {
      name: 'load',
      description: 'Load a session from a file',
      usage: '/load <filename>',
    },
  ],
  [
    'copy',
    {
      name: 'copy',
      description: 'Copy the last response or a specific message to clipboard',
      usage: '/copy [block_number]',
    },
  ],
  [
    'exit',
    {
      name: 'exit',
      description: 'Exit the application',
      usage: '/exit',
      aliases: ['q', 'quit'],
    },
  ],
  [
    'export',
    {
      name: 'export',
      description: 'Export conversation to markdown or JSON',
      usage: '/export <md|json> [filename]',
    },
  ],
  [
    'sessions',
    {
      name: 'sessions',
      description: 'List saved sessions or manage session history',
      usage: '/sessions [list|delete <id>]',
      aliases: ['ss'],
    },
  ],
  [
    'handoff',
    {
      name: 'handoff',
      description: 'Configure context handoff settings',
      usage: '/handoff [show|prompt|threshold|reset]',
    },
  ],
  [
    'prompts',
    {
      name: 'prompts',
      description: 'View or modify system prompts for each consciousness',
      usage: '/prompts [show|conscious|subconscious|kernel|reset]',
      aliases: ['prompt'],
    },
  ],
  [
    'bg',
    {
      name: 'bg',
      description: 'Show active background Zosia sessions',
      usage: '/bg',
      aliases: ['jobs', 'active'],
    },
  ],
  [
    'view',
    {
      name: 'view',
      description: 'Set display mode: companion, summary, split, or developer',
      usage: '/view <companion|summary|split|developer>',
      aliases: ['companion', 'summary', 'split', 'developer', 'c', 's', 'sp', 'd'],
    },
  ],
  [
    'onboarding',
    {
      name: 'onboarding',
      description: 'Check setup status and configure API keys',
      usage: '/onboarding [status|openrouter|memory|model]',
      aliases: ['setup', 'keys', 'config-status'],
    },
  ],
]);

/** Map aliases to their canonical command names */
const ALIAS_MAP = new Map<string, string>();

// Build alias map from commands
for (const [name, cmd] of COMMANDS) {
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      ALIAS_MAP.set(alias.toLowerCase(), name);
    }
  }
}

/**
 * Check if input is a slash command
 */
export function isSlashCommand(input: string): boolean {
  const trimmed = input.trim();

  // Must start with / followed by at least one non-space character
  if (!trimmed.startsWith('/')) {
    return false;
  }

  // Extract what comes after the slash
  const afterSlash = trimmed.slice(1);

  // Must have at least one character and no leading space
  if (afterSlash.length === 0 || afterSlash.startsWith(' ')) {
    return false;
  }

  // Get the command part (first word)
  const commandPart = afterSlash.split(/\s+/)[0].toLowerCase();

  // Check if it's a known command or alias
  return COMMANDS.has(commandPart) || ALIAS_MAP.has(commandPart);
}

/**
 * Parse a slash command into command name and arguments
 */
export function parseSlashCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();

  // Must be a valid slash command
  if (!isSlashCommand(trimmed)) {
    return null;
  }

  // Remove the leading slash
  const afterSlash = trimmed.slice(1);

  // Parse into parts, handling quoted arguments
  const parts = parseArguments(afterSlash);

  if (parts.length === 0) {
    return null;
  }

  // Get command name (lowercase)
  let commandName = parts[0].toLowerCase();

  // Resolve alias to canonical command name
  if (ALIAS_MAP.has(commandName)) {
    commandName = ALIAS_MAP.get(commandName)!;
  }

  // Verify it's a known command
  if (!COMMANDS.has(commandName)) {
    return null;
  }

  return {
    command: commandName,
    args: parts.slice(1),
  };
}

/**
 * Parse arguments, handling quoted strings
 */
function parseArguments(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuote) {
      if (char === quoteChar) {
        // End of quoted string
        inQuote = false;
        quoteChar = '';
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      // Start of quoted string
      inQuote = true;
      quoteChar = char;
    } else if (char === ' ' || char === '\t') {
      // Whitespace - end current argument
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  // Add final argument
  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

/**
 * Get help text for a specific command or all commands
 */
export function getCommandHelp(command?: string): string {
  if (command) {
    // Help for specific command
    const cmd = COMMANDS.get(command.toLowerCase());

    if (!cmd) {
      return `Unknown command: ${command}. Type /help for available commands.`;
    }

    let help = `${cmd.name} - ${cmd.description}\n`;
    help += `Usage: ${cmd.usage}`;

    if (cmd.aliases && cmd.aliases.length > 0) {
      help += `\nAliases: /${cmd.aliases.join(', /')}`;
    }

    return help;
  }

  // Help for all commands
  let help = 'Available commands:\n';

  for (const [, cmd] of COMMANDS) {
    help += `  /${cmd.name} - ${cmd.description}\n`;
  }

  help += '\nType /help <command> for detailed help on a specific command.';

  return help;
}
