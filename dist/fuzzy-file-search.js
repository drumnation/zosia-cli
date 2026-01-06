/**
 * Fuzzy File Search Module
 *
 * Provides "@" triggered fuzzy file search like Toad.
 * Type "@" to start searching, results filter as you type.
 * Respects .gitignore patterns.
 *
 * Usage:
 *   @file.ts          - Search for files matching "file.ts"
 *   @src/comp         - Search in paths matching "src/comp"
 *   @                 - Show all files (limited)
 */
import fg from 'fast-glob';
import Fuse from 'fuse.js';
import { existsSync, readFileSync } from 'fs';
import { resolve, basename, dirname } from 'path';
// ─────────────────────────────────────────────────────────────────────────────
// File Scanner
// ─────────────────────────────────────────────────────────────────────────────
/** Cache for scanned files */
let fileCache = null;
let fileCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds
/**
 * Parse .gitignore file and return patterns
 */
function parseGitignore(cwd) {
    const gitignorePath = resolve(cwd, '.gitignore');
    if (!existsSync(gitignorePath)) {
        return [];
    }
    try {
        const content = readFileSync(gitignorePath, 'utf-8');
        return content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'))
            .map((pattern) => {
            // Convert gitignore patterns to fast-glob patterns
            if (pattern.startsWith('/')) {
                return pattern.slice(1);
            }
            return `**/${pattern}`;
        });
    }
    catch {
        return [];
    }
}
/**
 * Scan files in the current working directory
 */
export async function scanFiles(cwd = process.cwd()) {
    // Check cache
    const now = Date.now();
    if (fileCache && now - fileCacheTime < CACHE_TTL) {
        return fileCache;
    }
    // Parse gitignore
    const gitignorePatterns = parseGitignore(cwd);
    // Default ignore patterns
    const defaultIgnore = [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/.turbo/**',
        '**/.cache/**',
        '**/tmp/**',
        '**/*.min.js',
        '**/*.min.css',
        '**/*.map',
        '**/package-lock.json',
        '**/pnpm-lock.yaml',
        '**/yarn.lock',
    ];
    const ignorePatterns = [...defaultIgnore, ...gitignorePatterns];
    try {
        const files = await fg('**/*', {
            cwd,
            ignore: ignorePatterns,
            onlyFiles: true,
            dot: false, // Ignore hidden files by default
            followSymbolicLinks: false,
            suppressErrors: true,
            // Limit to reasonable depth and count
            deep: 10,
        });
        // Convert to FileEntry objects
        const entries = files.slice(0, 5000).map((filePath) => {
            const name = basename(filePath);
            const dir = dirname(filePath);
            const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
            return {
                path: filePath,
                name,
                dir: dir === '.' ? '' : dir,
                ext,
            };
        });
        // Update cache
        fileCache = entries;
        fileCacheTime = now;
        return entries;
    }
    catch (error) {
        console.error('File scan error:', error);
        return [];
    }
}
/**
 * Invalidate the file cache (call after file operations)
 */
export function invalidateFileCache() {
    fileCache = null;
    fileCacheTime = 0;
}
// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy Search
// ─────────────────────────────────────────────────────────────────────────────
/** Fuse.js options for file search */
const FUSE_OPTIONS = {
    keys: [
        { name: 'name', weight: 0.6 },
        { name: 'path', weight: 0.3 },
        { name: 'dir', weight: 0.1 },
    ],
    threshold: 0.4, // Lower = more strict matching
    distance: 100,
    includeScore: true,
    minMatchCharLength: 1,
    shouldSort: true,
};
/**
 * Search files with fuzzy matching
 */
export async function searchFiles(query, cwd = process.cwd(), maxResults = 10) {
    const files = await scanFiles(cwd);
    if (!query || query.trim() === '') {
        // No query - return recent/common files (limited)
        return files.slice(0, maxResults).map((file) => ({
            file,
            score: 1,
        }));
    }
    // Create Fuse instance and search
    const fuse = new Fuse(files, FUSE_OPTIONS);
    const results = fuse.search(query, { limit: maxResults });
    return results.map((result) => ({
        file: result.item,
        score: result.score ?? 0,
    }));
}
// ─────────────────────────────────────────────────────────────────────────────
// Input Detection
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Detect if input contains an active @ search trigger
 * Returns the search state if active, null otherwise
 */
export function detectAtSearch(input, cursorPosition) {
    if (!input.includes('@')) {
        return null;
    }
    // Find the last @ that could be a file search trigger
    // Must be at start of word (preceded by space, start of string, or newline)
    const cursor = cursorPosition ?? input.length;
    let atPosition = -1;
    for (let i = cursor - 1; i >= 0; i--) {
        if (input[i] === '@') {
            // Check if preceded by whitespace or start
            if (i === 0 || /\s/.test(input[i - 1])) {
                atPosition = i;
                break;
            }
        }
        // Stop if we hit whitespace (search is in different word)
        if (/\s/.test(input[i])) {
            break;
        }
    }
    if (atPosition === -1) {
        return null;
    }
    // Extract the query (text after @)
    const afterAt = input.slice(atPosition + 1);
    const queryMatch = afterAt.match(/^([^\s]*)/);
    const query = queryMatch ? queryMatch[1] : '';
    return {
        active: true,
        query,
        atPosition,
        results: [],
        selectedIndex: 0,
    };
}
/**
 * Replace the @ query with the selected file path
 */
export function replaceAtQuery(input, atPosition, query, selectedPath) {
    const before = input.slice(0, atPosition);
    const afterQuery = input.slice(atPosition + 1 + query.length);
    // Insert the file path (with @ prefix for clarity that it's attached)
    return `${before}@${selectedPath}${afterQuery}`;
}
// ─────────────────────────────────────────────────────────────────────────────
// Display Helpers
// ─────────────────────────────────────────────────────────────────────────────
/** Icons for different file types */
const FILE_ICONS = {
    '.ts': '📘',
    '.tsx': '⚛️',
    '.js': '📒',
    '.jsx': '⚛️',
    '.json': '📋',
    '.md': '📄',
    '.css': '🎨',
    '.scss': '🎨',
    '.html': '🌐',
    '.py': '🐍',
    '.go': '🐹',
    '.rs': '🦀',
    '.sh': '💻',
    '.yml': '⚙️',
    '.yaml': '⚙️',
    '.toml': '⚙️',
    '.env': '🔐',
    '.gitignore': '🙈',
    '.png': '🖼️',
    '.jpg': '🖼️',
    '.svg': '🎨',
    default: '📄',
};
/**
 * Get icon for a file based on extension
 */
export function getFileIcon(ext) {
    return FILE_ICONS[ext.toLowerCase()] || FILE_ICONS.default;
}
/**
 * Format a file entry for display
 */
export function formatFileEntry(file, maxWidth = 50) {
    const icon = getFileIcon(file.ext);
    const displayPath = file.path.length > maxWidth - 3
        ? '...' + file.path.slice(-(maxWidth - 6))
        : file.path;
    return `${icon} ${displayPath}`;
}
// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────
export default {
    scanFiles,
    searchFiles,
    detectAtSearch,
    replaceAtQuery,
    invalidateFileCache,
    getFileIcon,
    formatFileEntry,
};
