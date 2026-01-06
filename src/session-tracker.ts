/**
 * Multi-Session Tracker for Zosia TUI
 *
 * Tracks running Zosia sessions across the system using a shared state file.
 * Enables the "bg" style HUD showing when multiple sessions are active.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Session tracking directory
const ZOSIA_STATE_DIR = path.join(os.homedir(), '.zosia', 'state');
const SESSIONS_FILE = path.join(ZOSIA_STATE_DIR, 'active-sessions.json');

/** A single tracked session */
export interface TrackedSession {
  /** Unique session ID */
  id: string;
  /** Process ID */
  pid: number;
  /** User ID associated with this session */
  userId: string;
  /** When the session started */
  startedAt: string;
  /** Last heartbeat timestamp */
  lastHeartbeat: string;
  /** Optional label for the session */
  label?: string;
  /** Current view mode */
  viewMode?: string;
}

/** Sessions state file structure */
interface SessionsState {
  sessions: TrackedSession[];
  lastUpdated: string;
}

/**
 * Ensure the state directory exists
 */
function ensureStateDir(): void {
  if (!fs.existsSync(ZOSIA_STATE_DIR)) {
    fs.mkdirSync(ZOSIA_STATE_DIR, { recursive: true });
  }
}

/**
 * Read current sessions state
 */
function readSessionsState(): SessionsState {
  ensureStateDir();

  if (!fs.existsSync(SESSIONS_FILE)) {
    return { sessions: [], lastUpdated: new Date().toISOString() };
  }

  try {
    const content = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(content) as SessionsState;
  } catch {
    // If file is corrupted, start fresh
    return { sessions: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Write sessions state
 */
function writeSessionsState(state: SessionsState): void {
  ensureStateDir();
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Clean up stale sessions (no heartbeat in 30 seconds or dead process)
 */
function cleanupStaleSessions(state: SessionsState): SessionsState {
  const now = Date.now();
  const staleThreshold = 30000; // 30 seconds

  state.sessions = state.sessions.filter((session) => {
    // Check if heartbeat is recent enough
    const lastHeartbeat = new Date(session.lastHeartbeat).getTime();
    if (now - lastHeartbeat > staleThreshold) {
      return false;
    }

    // Check if process is still running
    try {
      process.kill(session.pid, 0); // Signal 0 just checks if process exists
      return true;
    } catch {
      return false;
    }
  });

  return state;
}

/**
 * Register this session in the tracker
 */
export function registerSession(sessionId: string, userId: string, label?: string): void {
  let state = readSessionsState();
  state = cleanupStaleSessions(state);

  // Remove any existing session with this ID
  state.sessions = state.sessions.filter((s) => s.id !== sessionId);

  // Add new session
  const session: TrackedSession = {
    id: sessionId,
    pid: process.pid,
    userId,
    startedAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
    label,
  };

  state.sessions.push(session);
  writeSessionsState(state);
}

/**
 * Unregister this session from the tracker
 */
export function unregisterSession(sessionId: string): void {
  let state = readSessionsState();
  state.sessions = state.sessions.filter((s) => s.id !== sessionId);
  writeSessionsState(state);
}

/**
 * Update session heartbeat (call periodically to indicate session is alive)
 */
export function heartbeat(sessionId: string, updates?: Partial<TrackedSession>): void {
  let state = readSessionsState();

  const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
  if (sessionIndex >= 0) {
    state.sessions[sessionIndex].lastHeartbeat = new Date().toISOString();
    if (updates) {
      state.sessions[sessionIndex] = { ...state.sessions[sessionIndex], ...updates };
    }
    writeSessionsState(state);
  }
}

/**
 * Get all active sessions (excluding this one optionally)
 */
export function getActiveSessions(excludeSessionId?: string): TrackedSession[] {
  let state = readSessionsState();
  state = cleanupStaleSessions(state);
  writeSessionsState(state);

  let sessions = state.sessions;
  if (excludeSessionId) {
    sessions = sessions.filter((s) => s.id !== excludeSessionId);
  }

  return sessions;
}

/**
 * Get count of other active sessions
 */
export function getOtherSessionCount(currentSessionId: string): number {
  return getActiveSessions(currentSessionId).length;
}

/**
 * Format session info for display
 */
export function formatSessionInfo(session: TrackedSession): string {
  const age = getRelativeAge(session.startedAt);
  const label = session.label || session.userId;
  return `${label} (${age})`;
}

/**
 * Get relative age string
 */
function getRelativeAge(isoString: string): string {
  const startDate = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just started';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  return `${Math.floor(diffHours / 24)}d`;
}

/**
 * Create a session tracker that manages lifecycle automatically
 */
export function createSessionTracker(sessionId: string, userId: string, label?: string) {
  let heartbeatInterval: NodeJS.Timeout | null = null;

  // Register on creation
  registerSession(sessionId, userId, label);

  // Start heartbeat
  heartbeatInterval = setInterval(() => {
    heartbeat(sessionId);
  }, 10000); // Every 10 seconds

  // Cleanup on process exit
  const cleanup = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    unregisterSession(sessionId);
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  return {
    /** Update session metadata */
    update: (updates: Partial<TrackedSession>) => heartbeat(sessionId, updates),
    /** Get other active sessions */
    getOthers: () => getActiveSessions(sessionId),
    /** Get count of other sessions */
    getOtherCount: () => getOtherSessionCount(sessionId),
    /** Manual cleanup */
    cleanup,
  };
}
