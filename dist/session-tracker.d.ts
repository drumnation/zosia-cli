/**
 * Multi-Session Tracker for Zosia TUI
 *
 * Tracks running Zosia sessions across the system using a shared state file.
 * Enables the "bg" style HUD showing when multiple sessions are active.
 */
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
/**
 * Register this session in the tracker
 */
export declare function registerSession(sessionId: string, userId: string, label?: string): void;
/**
 * Unregister this session from the tracker
 */
export declare function unregisterSession(sessionId: string): void;
/**
 * Update session heartbeat (call periodically to indicate session is alive)
 */
export declare function heartbeat(sessionId: string, updates?: Partial<TrackedSession>): void;
/**
 * Get all active sessions (excluding this one optionally)
 */
export declare function getActiveSessions(excludeSessionId?: string): TrackedSession[];
/**
 * Get count of other active sessions
 */
export declare function getOtherSessionCount(currentSessionId: string): number;
/**
 * Format session info for display
 */
export declare function formatSessionInfo(session: TrackedSession): string;
/**
 * Create a session tracker that manages lifecycle automatically
 */
export declare function createSessionTracker(sessionId: string, userId: string, label?: string): {
    /** Update session metadata */
    update: (updates: Partial<TrackedSession>) => void;
    /** Get other active sessions */
    getOthers: () => TrackedSession[];
    /** Get count of other sessions */
    getOtherCount: () => number;
    /** Manual cleanup */
    cleanup: () => void;
};
//# sourceMappingURL=session-tracker.d.ts.map