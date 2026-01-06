/**
 * Attachment Parsing Module
 *
 * Detects and parses file paths and URLs from user input.
 * Enables file context injection into conversations.
 * Supports image files for vision models.
 */
import { existsSync, readFileSync, statSync } from 'fs';
import { resolve, extname } from 'path';
import { homedir } from 'os';
/** Supported image extensions for vision models */
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);
/** MIME types for image extensions */
const IMAGE_MIME_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
};
/** Maximum image size (10MB) */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
// Regex patterns for detection
const PATTERNS = {
    // URLs: http://, https://, file://
    url: /\b(https?:\/\/|file:\/\/)[^\s<>"{}|\\^`\[\]]+/gi,
    // Absolute Unix paths: /path/to/file
    unixPath: /(?<![a-zA-Z0-9$])\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+/g,
    // Relative paths: ./path or ../path
    relativePath: /(?:^|\s)(\.\.?\/[^\s"']+)/g,
    // Home directory: ~/path
    homePath: /(?:^|\s)(~\/[^\s"']+)/g,
    // Quoted paths (with spaces): "/path/with spaces/file.txt"
    quotedPath: /"((?:\/|~\/|\.\.?\/)[^"]+)"/g,
    // Windows paths: C:\path\to\file
    windowsPath: /\b[A-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]+\.[a-zA-Z0-9]+/gi,
};
/**
 * Parse attachments (file paths and URLs) from input text
 */
export function parseAttachments(input) {
    if (!input || !input.trim()) {
        return { attachments: [], cleanedText: input };
    }
    const attachments = [];
    const foundPaths = new Set();
    // Track character ranges that are already matched to avoid overlaps
    const matchedRanges = [];
    let cleanedText = input;
    // Helper to check if a position overlaps with already matched ranges
    const isOverlapping = (start, end) => {
        return matchedRanges.some((range) => start < range.end && end > range.start);
    };
    // Helper to add attachment and track for dedup
    const addAttachment = (type, path, start, end) => {
        // Skip if overlapping with existing match
        if (isOverlapping(start, end)) {
            return;
        }
        if (!foundPaths.has(path)) {
            foundPaths.add(path);
            matchedRanges.push({ start, end });
            const attachment = { type, path };
            // Check file existence for file types
            if (type === 'file') {
                const resolvedPath = resolvePath(path);
                attachment.exists = existsSync(resolvedPath);
                // Check if it's an image file
                const ext = extname(path).toLowerCase();
                if (IMAGE_EXTENSIONS.has(ext)) {
                    attachment.isImage = true;
                    attachment.mimeType = IMAGE_MIME_TYPES[ext];
                }
            }
            attachments.push(attachment);
            // Remove from cleaned text
            cleanedText = cleanedText.replace(path, '');
        }
    };
    // Extract quoted paths first (they may contain spaces)
    let match;
    const quotedRegex = new RegExp(PATTERNS.quotedPath.source, 'g');
    while ((match = quotedRegex.exec(input)) !== null) {
        const quotedPath = match[1];
        addAttachment('file', quotedPath, match.index, match.index + match[0].length);
        // Also remove the quotes from cleaned text
        cleanedText = cleanedText.replace(`"${quotedPath}"`, '');
    }
    // Extract URLs (before file paths since URLs may contain path-like segments)
    const urlRegex = new RegExp(PATTERNS.url.source, 'gi');
    while ((match = urlRegex.exec(input)) !== null) {
        addAttachment('url', match[0], match.index, match.index + match[0].length);
    }
    // Extract Windows paths
    const windowsRegex = new RegExp(PATTERNS.windowsPath.source, 'gi');
    while ((match = windowsRegex.exec(input)) !== null) {
        addAttachment('file', match[0], match.index, match.index + match[0].length);
    }
    // Extract home directory paths (before relative/absolute to avoid overlap)
    const homeRegex = /(?:^|\s)(~\/[^\s"']+)/g;
    while ((match = homeRegex.exec(input)) !== null) {
        const path = match[1].trim();
        const pathStart = match.index + match[0].indexOf(path);
        addAttachment('file', path, pathStart, pathStart + path.length);
    }
    // Extract relative paths
    const relativeRegex = /(?:^|\s)(\.\.?\/[^\s"']+)/g;
    while ((match = relativeRegex.exec(input)) !== null) {
        const path = match[1].trim();
        const pathStart = match.index + match[0].indexOf(path);
        addAttachment('file', path, pathStart, pathStart + path.length);
    }
    // Extract absolute Unix paths (careful not to match things like $50/month)
    const unixRegex = new RegExp(PATTERNS.unixPath.source, 'g');
    while ((match = unixRegex.exec(input)) !== null) {
        const path = match[0];
        // Skip if it looks like a price or ratio
        const beforeChar = input[match.index - 1];
        if (beforeChar === '$' || beforeChar === '€' || beforeChar === '£') {
            continue;
        }
        addAttachment('file', path, match.index, match.index + path.length);
    }
    return { attachments, cleanedText };
}
/**
 * Resolve a path to absolute, handling ~ and relative paths
 */
function resolvePath(path) {
    if (path.startsWith('~/')) {
        return resolve(homedir(), path.slice(2));
    }
    return resolve(path);
}
/** Maximum file size to read (50KB) */
const MAX_FILE_SIZE = 50 * 1024;
/**
 * Read content from an attachment
 * Returns null if file doesn't exist or can't be read
 */
export async function readAttachmentContent(attachment) {
    if (attachment.type !== 'file') {
        return null; // URL fetching not implemented yet
    }
    if (attachment.exists === false) {
        return null;
    }
    try {
        const resolvedPath = resolvePath(attachment.path);
        // Read file content
        const fullContent = readFileSync(resolvedPath, 'utf-8');
        // Check if binary (contains null bytes or non-printable chars)
        if (isBinaryContent(fullContent)) {
            return `[binary file: ${attachment.path}]`;
        }
        // Truncate if too large (check by character count since we already read it)
        if (fullContent.length > MAX_FILE_SIZE) {
            return fullContent.slice(0, MAX_FILE_SIZE) + '\n\n[truncated]';
        }
        return fullContent;
    }
    catch {
        return null;
    }
}
/**
 * Check if content appears to be binary
 */
function isBinaryContent(content) {
    // Check for null bytes
    if (content.includes('\0')) {
        return true;
    }
    // Check ratio of non-printable characters
    let nonPrintable = 0;
    const sample = content.slice(0, 1000);
    for (const char of sample) {
        const code = char.charCodeAt(0);
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
            nonPrintable++;
        }
    }
    return nonPrintable / sample.length > 0.1;
}
/**
 * Check if an attachment is a supported image
 */
export function isImageAttachment(attachment) {
    return attachment.type === 'file' && attachment.isImage === true && attachment.exists === true;
}
/**
 * Read an image file and return base64-encoded content for vision API
 * Returns null if file doesn't exist, isn't an image, or is too large
 */
export async function readImageAsBase64(attachment) {
    if (!isImageAttachment(attachment)) {
        return null;
    }
    try {
        const resolvedPath = resolvePath(attachment.path);
        const stats = statSync(resolvedPath);
        // Check file size
        if (stats.size > MAX_IMAGE_SIZE) {
            console.warn(`Image too large (${(stats.size / 1024 / 1024).toFixed(1)}MB > 10MB): ${attachment.path}`);
            return null;
        }
        // Read file as binary buffer and convert to base64
        const buffer = readFileSync(resolvedPath);
        const base64 = buffer.toString('base64');
        return {
            base64,
            mimeType: attachment.mimeType || 'image/png',
            path: attachment.path,
            sizeBytes: stats.size,
        };
    }
    catch (error) {
        console.error(`Failed to read image: ${attachment.path}`, error);
        return null;
    }
}
/**
 * Get all images from a list of attachments
 */
export async function getImageAttachments(attachments) {
    const images = [];
    for (const attachment of attachments) {
        if (isImageAttachment(attachment)) {
            const imageContent = await readImageAsBase64(attachment);
            if (imageContent) {
                images.push(imageContent);
            }
        }
    }
    return images;
}
/**
 * Check if any attachments contain images
 */
export function hasImages(attachments) {
    return attachments.some(isImageAttachment);
}
