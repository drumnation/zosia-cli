/**
 * Image Preview Module
 *
 * Provides inline image preview for terminals that support it (Kitty, iTerm2).
 * Falls back to a nice compact display for other terminals.
 */
import { execSync, spawnSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { basename } from 'path';
/** Check if running in Kitty terminal */
export function isKittyTerminal() {
    return process.env.TERM === 'xterm-kitty' || !!process.env.KITTY_WINDOW_ID;
}
/** Check if running in iTerm2 */
export function isITerm2() {
    return process.env.TERM_PROGRAM === 'iTerm.app';
}
/** Get image dimensions using sips (macOS) */
export function getImageDimensions(imagePath) {
    if (!existsSync(imagePath))
        return null;
    try {
        const result = execSync(`sips -g pixelWidth -g pixelHeight "${imagePath}" 2>/dev/null`, { encoding: 'utf-8' });
        const widthMatch = result.match(/pixelWidth:\s*(\d+)/);
        const heightMatch = result.match(/pixelHeight:\s*(\d+)/);
        if (widthMatch && heightMatch) {
            return {
                width: parseInt(widthMatch[1], 10),
                height: parseInt(heightMatch[1], 10),
            };
        }
    }
    catch {
        // Ignore errors
    }
    return null;
}
/** Get file size in human readable format */
export function getFileSize(imagePath) {
    try {
        const stats = statSync(imagePath);
        const bytes = stats.size;
        if (bytes < 1024)
            return `${bytes}B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
    catch {
        return '?';
    }
}
/** Format image reference for display (short form) */
export function formatImageRef(imagePath) {
    const filename = basename(imagePath);
    const dims = getImageDimensions(imagePath);
    const size = getFileSize(imagePath);
    if (dims) {
        return `📷 ${filename.slice(0, 20)}${filename.length > 20 ? '…' : ''} (${dims.width}×${dims.height}, ${size})`;
    }
    return `📷 ${filename.slice(0, 30)}${filename.length > 30 ? '…' : ''}`;
}
/** Display image in Kitty terminal using icat */
export function displayImageKitty(imagePath, maxHeight = 10) {
    if (!isKittyTerminal() || !existsSync(imagePath))
        return false;
    try {
        // Use kitty icat to display image with limited height
        spawnSync('kitty', [
            '+kitten', 'icat',
            '--align', 'left',
            '--place', `40x${maxHeight}@0x0`,
            imagePath
        ], { stdio: 'inherit' });
        return true;
    }
    catch {
        return false;
    }
}
/** Generate a simple ASCII representation of image info */
export function generateImageCard(imagePath) {
    const filename = basename(imagePath);
    const dims = getImageDimensions(imagePath);
    const size = getFileSize(imagePath);
    const shortName = filename.length > 24
        ? filename.slice(0, 21) + '...'
        : filename;
    const lines = [];
    lines.push('┌' + '─'.repeat(30) + '┐');
    lines.push('│ 📷 ' + shortName.padEnd(25) + '│');
    if (dims) {
        const dimStr = `${dims.width}×${dims.height}`;
        lines.push('│    ' + `${dimStr}, ${size}`.padEnd(25) + '│');
    }
    else {
        lines.push('│    ' + size.padEnd(25) + '│');
    }
    lines.push('└' + '─'.repeat(30) + '┘');
    return lines;
}
/**
 * Create a compact token for the input field
 * Returns { display: string, actual: string }
 * - display: What to show in the input (short form)
 * - actual: The real path to include when sending
 */
export function createImageToken(imagePath) {
    const filename = basename(imagePath);
    const shortName = filename.length > 15
        ? 'clipboard-' + filename.slice(-8)
        : filename;
    return {
        display: `[📷 ${shortName}]`,
        actual: `@${imagePath}`,
    };
}
/** Extract image tokens from text, returning { cleanText, images } */
export function parseImageTokens(text) {
    const imagePattern = /\[📷 ([^\]]+)\]\{([^}]+)\}/g;
    const images = [];
    const cleanText = text.replace(imagePattern, (_, display, path) => {
        images.push({ display, path });
        return `@${path}`;
    });
    return { cleanText, images };
}
/** Create an encoded token that stores path but displays nicely */
export function encodeImageToken(imagePath) {
    const filename = basename(imagePath);
    const shortName = filename.length > 12
        ? filename.slice(0, 9) + '...'
        : filename;
    // Format: [📷 shortname]{fullpath}
    // When displaying, we show [📷 shortname]
    // When sending, we extract the full path
    return `[📷 ${shortName}]{${imagePath}}`;
}
/** Decode image tokens back to @path format for sending */
export function decodeImageTokens(text) {
    return text.replace(/\[📷 [^\]]+\]\{([^}]+)\}/g, '@$1');
}
/** Check if text contains image tokens */
export function hasImageTokens(text) {
    return /\[📷 [^\]]+\]/.test(text);
}
