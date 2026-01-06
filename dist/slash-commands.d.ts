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
export declare const COMMANDS: Map<string, SlashCommand>;
/**
 * Check if input is a slash command
 */
export declare function isSlashCommand(input: string): boolean;
/**
 * Parse a slash command into command name and arguments
 */
export declare function parseSlashCommand(input: string): ParsedCommand | null;
/**
 * Get help text for a specific command or all commands
 */
export declare function getCommandHelp(command?: string): string;
//# sourceMappingURL=slash-commands.d.ts.map