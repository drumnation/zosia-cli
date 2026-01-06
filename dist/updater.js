/**
 * GitHub-based Update Checker
 *
 * Checks for updates from GitHub repo since we're not on npm registry.
 * Caches check results to avoid hitting GitHub API on every run.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/drumnation/zosia-cli/main/package.json';
const CHECK_INTERVAL_MS = 1000 * 60 * 60; // 1 hour
const CACHE_FILE = join(homedir(), '.zosia', 'update-check.json');
/**
 * Get cached update info
 */
function getCache() {
    try {
        if (existsSync(CACHE_FILE)) {
            return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
        }
    }
    catch {
        // Ignore cache errors
    }
    return null;
}
/**
 * Save update info to cache
 */
function saveCache(cache) {
    try {
        const dir = join(homedir(), '.zosia');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    }
    catch {
        // Ignore cache errors
    }
}
/**
 * Compare semver versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a, b) {
    const partsA = a.replace(/^v/, '').split('.').map(Number);
    const partsB = b.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;
        if (numA < numB)
            return -1;
        if (numA > numB)
            return 1;
    }
    return 0;
}
/**
 * Fetch latest version from GitHub (async, non-blocking)
 */
async function fetchLatestVersion() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(GITHUB_RAW_URL, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'zosia-cli',
            },
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            return null;
        }
        const remotePkg = await response.json();
        return remotePkg.version;
    }
    catch {
        return null;
    }
}
/**
 * Check for updates (runs in background, doesn't block)
 */
export async function checkForUpdates() {
    const currentVersion = pkg.version;
    // Check cache first
    const cache = getCache();
    if (cache && Date.now() - cache.lastCheck < CHECK_INTERVAL_MS) {
        return {
            updateAvailable: cache.updateAvailable,
            currentVersion,
            latestVersion: cache.latestVersion,
        };
    }
    // Fetch from GitHub
    const latestVersion = await fetchLatestVersion();
    const updateAvailable = latestVersion !== null &&
        compareVersions(currentVersion, latestVersion) < 0;
    // Save to cache
    saveCache({
        lastCheck: Date.now(),
        latestVersion,
        updateAvailable,
    });
    return {
        updateAvailable,
        currentVersion,
        latestVersion,
    };
}
/**
 * Display update notification if available
 */
export async function notifyIfUpdateAvailable() {
    try {
        const { updateAvailable, currentVersion, latestVersion } = await checkForUpdates();
        if (updateAvailable && latestVersion) {
            const chalk = (await import('chalk')).default;
            console.log();
            console.log(chalk.yellow('╭─────────────────────────────────────────────────────╮'));
            console.log(chalk.yellow('│') + chalk.white(`  Update available: ${currentVersion} → ${chalk.green(latestVersion)}`) + chalk.yellow('                   │'));
            console.log(chalk.yellow('│') + chalk.gray('  Run: ') + chalk.cyan('zosia update') + chalk.gray(' to update') + chalk.yellow('                       │'));
            console.log(chalk.yellow('╰─────────────────────────────────────────────────────╯'));
            console.log();
        }
    }
    catch {
        // Silently ignore update check errors
    }
}
/**
 * Run the update command
 */
export async function runUpdate() {
    const chalk = (await import('chalk')).default;
    console.log(chalk.cyan('\n🔄 Updating Zosia from GitHub...\n'));
    return new Promise((resolve) => {
        const child = spawn('npm', ['install', '-g', 'github:drumnation/zosia-cli'], {
            stdio: 'inherit',
            shell: true,
        });
        child.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green('\n✓ Zosia updated successfully!'));
                console.log(chalk.gray('  Run "zosia --version" to see the new version.\n'));
                // Clear the cache so next run shows correct version
                try {
                    const cache = getCache();
                    if (cache) {
                        cache.updateAvailable = false;
                        saveCache(cache);
                    }
                }
                catch {
                    // Ignore
                }
                resolve(true);
            }
            else {
                console.log(chalk.red('\n✗ Update failed. Please try manually:'));
                console.log(chalk.gray('  npm install -g github:drumnation/zosia-cli\n'));
                resolve(false);
            }
        });
        child.on('error', (error) => {
            console.log(chalk.red('\n✗ Update failed:'), error.message);
            console.log(chalk.gray('  Try running manually: npm install -g github:drumnation/zosia-cli\n'));
            resolve(false);
        });
    });
}
/**
 * Get current version
 */
export function getCurrentVersion() {
    return pkg.version;
}
