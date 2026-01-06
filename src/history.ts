/**
 * Input History Module
 *
 * Manages input history for the interactive CLI with navigation
 * (up/down arrows) and optional persistence to disk.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/** Configuration options for history manager */
export interface HistoryOptions {
  /** Maximum number of entries to keep */
  maxSize?: number;
  /** Path to persist history (optional) */
  persistPath?: string;
}

/** History manager interface */
export interface HistoryManager {
  /** Add an entry to history */
  add(entry: string): void;
  /** Get previous entry (up arrow) */
  previous(): string | null;
  /** Get next entry (down arrow) */
  next(): string | null;
  /** Get current entry during navigation */
  getCurrent(): string | null;
  /** Get all history entries */
  getHistory(): string[];
  /** Reset navigation state */
  reset(): void;
  /** Clear all history */
  clear(): void;
  /** Search history for entries containing query */
  search(query: string): string[];
}

const DEFAULT_MAX_SIZE = 1000;

/**
 * Create a history manager
 */
export function createHistoryManager(options: HistoryOptions = {}): HistoryManager {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const persistPath = options.persistPath;

  // Load history from file if exists
  let history: string[] = [];
  if (persistPath && existsSync(persistPath)) {
    try {
      const content = readFileSync(persistPath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        history = parsed;
      }
    } catch {
      // Corrupted file, start fresh
      history = [];
    }
  }

  // Navigation index: -1 means not navigating, 0 is most recent
  let navIndex = -1;

  // Persist to file
  const persist = () => {
    if (persistPath) {
      try {
        // Ensure directory exists
        const dir = dirname(persistPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(persistPath, JSON.stringify(history, null, 2));
      } catch {
        // Ignore persistence errors
      }
    }
  };

  return {
    add(entry: string): void {
      const trimmed = entry.trim();
      if (!trimmed) return;

      // Don't add duplicate of last entry
      if (history.length > 0 && history[history.length - 1] === trimmed) {
        // Reset navigation
        navIndex = -1;
        return;
      }

      history.push(trimmed);

      // Enforce max size
      while (history.length > maxSize) {
        history.shift();
      }

      // Reset navigation
      navIndex = -1;

      // Persist
      persist();
    },

    previous(): string | null {
      if (history.length === 0) return null;

      if (navIndex === -1) {
        // Start navigating from most recent
        navIndex = history.length - 1;
      } else if (navIndex > 0) {
        // Move to older entry
        navIndex--;
      }
      // If already at oldest (navIndex === 0), stay there

      return history[navIndex];
    },

    next(): string | null {
      if (navIndex === -1) {
        // Not navigating
        return null;
      }

      if (navIndex < history.length - 1) {
        // Move to newer entry
        navIndex++;
        return history[navIndex];
      }

      // At newest entry, return null to indicate end
      navIndex = -1;
      return null;
    },

    getCurrent(): string | null {
      if (navIndex === -1) return null;
      return history[navIndex];
    },

    getHistory(): string[] {
      return [...history];
    },

    reset(): void {
      navIndex = -1;
    },

    clear(): void {
      history = [];
      navIndex = -1;
      persist();
    },

    search(query: string): string[] {
      const lowerQuery = query.toLowerCase();
      return history.filter((entry) =>
        entry.toLowerCase().includes(lowerQuery)
      );
    },
  };
}

/**
 * Get the default history file path
 */
export function getDefaultHistoryPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return `${home}/.zosia/history.json`;
}
