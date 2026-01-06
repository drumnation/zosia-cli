/**
 * GitHub-based Update Checker
 *
 * Checks for updates from GitHub repo since we're not on npm registry.
 * Caches check results to avoid hitting GitHub API on every run.
 */
/**
 * Check for updates (runs in background, doesn't block)
 */
export declare function checkForUpdates(): Promise<{
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion: string | null;
}>;
/**
 * Display update notification if available
 */
export declare function notifyIfUpdateAvailable(): Promise<void>;
/**
 * Run the update command
 */
export declare function runUpdate(): Promise<boolean>;
/**
 * Get current version
 */
export declare function getCurrentVersion(): string;
//# sourceMappingURL=updater.d.ts.map