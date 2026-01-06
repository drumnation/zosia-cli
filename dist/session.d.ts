/**
 * Session Management Module
 *
 * Handles saving, loading, and managing conversation sessions.
 * Sessions store messages, token usage, model info, and timestamps.
 */
/** Individual message in a session */
export interface SessionMessage {
    /** Message role */
    role: 'user' | 'assistant' | 'system';
    /** Message content */
    content: string;
    /** When message was created */
    timestamp: string;
    /** Prompt tokens used (assistant messages) */
    promptTokens?: number;
    /** Completion tokens used (assistant messages) */
    completionTokens?: number;
    /** Cost in USD (assistant messages) */
    cost?: number;
}
/** Token usage summary */
export interface TokenUsage {
    totalPromptTokens: number;
    totalCompletionTokens: number;
}
/** Full session data */
export interface Session {
    /** Unique session identifier */
    id: string;
    /** Human-readable name */
    name: string;
    /** When session was created */
    createdAt: string;
    /** When session was last updated */
    updatedAt: string;
    /** Model used for this session */
    model: string;
    /** All messages in the session */
    messages: SessionMessage[];
    /** Cumulative token usage */
    tokenUsage: TokenUsage;
}
/** Session metadata for listing */
export interface SessionMetadata {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    model: string;
    messageCount: number;
    totalTokens: number;
    filePath: string;
}
/** Options for saving a session */
export interface SaveOptions {
    /** Directory to save session in */
    directory?: string;
    /** Filename (without path) */
    filename?: string;
}
/**
 * Get the default sessions directory
 */
export declare function getSessionPath(): string;
/**
 * Save a session to file
 */
export declare function saveSession(session: Session, options?: SaveOptions): Promise<string>;
/**
 * Load a session from file
 */
export declare function loadSession(filePath: string): Promise<Session>;
/**
 * List all sessions in a directory
 */
export declare function listSessions(directory: string): Promise<SessionMetadata[]>;
/**
 * Delete a session file
 */
export declare function deleteSession(filePath: string): Promise<void>;
/** Options for exporting sessions */
export interface ExportOptions {
    /** Include timestamps for each message */
    includeTimestamps?: boolean;
    /** Include token counts for each message */
    includeTokens?: boolean;
    /** Include cost information */
    includeCost?: boolean;
    /** Include session metadata header */
    includeHeader?: boolean;
}
/**
 * Export session to Markdown format
 *
 * Creates a human-readable markdown document with:
 * - Session metadata header
 * - Formatted conversation with role labels
 * - Optional timestamps and token counts
 */
export declare function exportToMarkdown(session: Session, options?: ExportOptions): string;
/**
 * Export session to JSON format with full metadata
 *
 * Enhanced JSON export with:
 * - Export timestamp
 * - Computed statistics
 * - Full message history
 */
export declare function exportToJSON(session: Session, options?: ExportOptions): string;
/**
 * Generate a session name from the first user message
 */
export declare function generateSessionName(messages: SessionMessage[]): string;
//# sourceMappingURL=session.d.ts.map