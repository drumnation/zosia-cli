/**
 * Session Management Module
 *
 * Handles saving, loading, and managing conversation sessions.
 * Sessions store messages, token usage, model info, and timestamps.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
/** Current session format version */
const SESSION_VERSION = 1;
/**
 * Get the default sessions directory
 */
export function getSessionPath() {
    const homeDir = os.homedir();
    const sessionDir = path.join(homeDir, '.zosia', 'sessions');
    // Create directory if it doesn't exist
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
}
/**
 * Save a session to file
 */
export async function saveSession(session, options = {}) {
    const directory = options.directory ?? getSessionPath();
    // Ensure directory exists
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
    // Generate filename
    const filename = options.filename ?? `${session.id}.json`;
    const filePath = path.join(directory, filename);
    // Create persisted format with version
    const persisted = {
        ...session,
        version: SESSION_VERSION,
    };
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(persisted, null, 2), 'utf-8');
    return filePath;
}
/**
 * Load a session from file
 */
export async function loadSession(filePath) {
    // Check file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`Session file not found: ${filePath}`);
    }
    // Read and parse
    let content;
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        content = JSON.parse(raw);
    }
    catch (err) {
        throw new Error(`Failed to parse session file: ${filePath}`);
    }
    // Validate structure
    if (!isValidSession(content)) {
        throw new Error(`Invalid session structure in: ${filePath}`);
    }
    return content;
}
/**
 * Validate session structure
 */
function isValidSession(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const session = data;
    // Required fields
    if (typeof session.id !== 'string')
        return false;
    if (typeof session.name !== 'string')
        return false;
    if (typeof session.createdAt !== 'string')
        return false;
    if (typeof session.updatedAt !== 'string')
        return false;
    if (typeof session.model !== 'string')
        return false;
    if (!Array.isArray(session.messages))
        return false;
    if (typeof session.tokenUsage !== 'object')
        return false;
    return true;
}
/**
 * List all sessions in a directory
 */
export async function listSessions(directory) {
    // Check directory exists
    if (!fs.existsSync(directory)) {
        return [];
    }
    // Find all JSON files
    const files = fs.readdirSync(directory).filter((f) => f.endsWith('.json'));
    // Load metadata from each file
    const sessions = [];
    for (const file of files) {
        const filePath = path.join(directory, file);
        try {
            const session = await loadSession(filePath);
            sessions.push({
                id: session.id,
                name: session.name,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                model: session.model,
                messageCount: session.messages.length,
                totalTokens: session.tokenUsage.totalPromptTokens +
                    session.tokenUsage.totalCompletionTokens,
                filePath,
            });
        }
        catch {
            // Skip invalid files
        }
    }
    // Sort by updatedAt descending (newest first)
    sessions.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return sessions;
}
/**
 * Delete a session file
 */
export async function deleteSession(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
const DEFAULT_EXPORT_OPTIONS = {
    includeTimestamps: true,
    includeTokens: true,
    includeCost: true,
    includeHeader: true,
};
/**
 * Export session to Markdown format
 *
 * Creates a human-readable markdown document with:
 * - Session metadata header
 * - Formatted conversation with role labels
 * - Optional timestamps and token counts
 */
export function exportToMarkdown(session, options = {}) {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    const lines = [];
    // Header
    if (opts.includeHeader) {
        lines.push(`# ${session.name}`);
        lines.push('');
        lines.push(`**Session ID:** ${session.id}`);
        lines.push(`**Model:** ${session.model}`);
        lines.push(`**Created:** ${formatDate(session.createdAt)}`);
        lines.push(`**Updated:** ${formatDate(session.updatedAt)}`);
        lines.push(`**Messages:** ${session.messages.length}`);
        if (opts.includeTokens) {
            const total = session.tokenUsage.totalPromptTokens + session.tokenUsage.totalCompletionTokens;
            lines.push(`**Total Tokens:** ${total.toLocaleString()} (${session.tokenUsage.totalPromptTokens.toLocaleString()} prompt + ${session.tokenUsage.totalCompletionTokens.toLocaleString()} completion)`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');
    }
    // Messages
    for (const msg of session.messages) {
        // Role header
        const roleLabel = getRoleLabel(msg.role);
        let header = `### ${roleLabel}`;
        if (opts.includeTimestamps && msg.timestamp) {
            header += ` *(${formatTime(msg.timestamp)})*`;
        }
        lines.push(header);
        lines.push('');
        // Content
        lines.push(msg.content);
        lines.push('');
        // Token info for assistant messages
        if (opts.includeTokens && msg.role === 'assistant' && (msg.promptTokens || msg.completionTokens)) {
            const tokenInfo = [];
            if (msg.promptTokens)
                tokenInfo.push(`${msg.promptTokens} prompt`);
            if (msg.completionTokens)
                tokenInfo.push(`${msg.completionTokens} completion`);
            if (opts.includeCost && msg.cost !== undefined) {
                tokenInfo.push(`$${msg.cost.toFixed(4)}`);
            }
            lines.push(`> *Tokens: ${tokenInfo.join(' + ')}*`);
            lines.push('');
        }
    }
    return lines.join('\n');
}
/**
 * Export session to JSON format with full metadata
 *
 * Enhanced JSON export with:
 * - Export timestamp
 * - Computed statistics
 * - Full message history
 */
export function exportToJSON(session, options = {}) {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    // Calculate statistics
    const userMessages = session.messages.filter(m => m.role === 'user').length;
    const assistantMessages = session.messages.filter(m => m.role === 'assistant').length;
    const systemMessages = session.messages.filter(m => m.role === 'system').length;
    const totalTokens = session.tokenUsage.totalPromptTokens + session.tokenUsage.totalCompletionTokens;
    const totalCost = session.messages
        .filter(m => m.cost !== undefined)
        .reduce((sum, m) => sum + (m.cost || 0), 0);
    const exported = {
        exportedAt: new Date().toISOString(),
        exportVersion: 1,
        session: {
            id: session.id,
            name: session.name,
            model: session.model,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
        },
        statistics: {
            messageCount: session.messages.length,
            userMessages,
            assistantMessages,
            systemMessages,
            totalTokens,
            promptTokens: session.tokenUsage.totalPromptTokens,
            completionTokens: session.tokenUsage.totalCompletionTokens,
            ...(opts.includeCost && { totalCost }),
        },
        messages: session.messages.map(msg => {
            const exported = {
                role: msg.role,
                content: msg.content,
            };
            if (opts.includeTimestamps) {
                exported.timestamp = msg.timestamp;
            }
            if (opts.includeTokens && msg.role === 'assistant') {
                if (msg.promptTokens !== undefined)
                    exported.promptTokens = msg.promptTokens;
                if (msg.completionTokens !== undefined)
                    exported.completionTokens = msg.completionTokens;
            }
            if (opts.includeCost && msg.cost !== undefined) {
                exported.cost = msg.cost;
            }
            return exported;
        }),
    };
    return JSON.stringify(exported, null, 2);
}
/**
 * Format ISO date for display
 */
function formatDate(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
    catch {
        return isoString;
    }
}
/**
 * Format ISO timestamp for inline display
 */
function formatTime(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    catch {
        return isoString;
    }
}
/**
 * Get human-readable role label
 */
function getRoleLabel(role) {
    switch (role) {
        case 'user': return '👤 You';
        case 'assistant': return '✧ Zosia';
        case 'system': return '⚙️ System';
        default: return role;
    }
}
/**
 * Generate a session name from the first user message
 */
export function generateSessionName(messages) {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) {
        return `Session ${new Date().toISOString().slice(0, 10)}`;
    }
    // Take first 50 chars of first user message, clean up
    let name = firstUserMessage.content
        .slice(0, 50)
        .replace(/\n/g, ' ')
        .replace(/[^\w\s-]/g, '')
        .trim();
    // Truncate at word boundary
    if (name.length >= 50) {
        const lastSpace = name.lastIndexOf(' ');
        if (lastSpace > 20) {
            name = name.slice(0, lastSpace);
        }
    }
    return name || `Session ${new Date().toISOString().slice(0, 10)}`;
}
