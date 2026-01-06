/**
 * Zosia Orchestrator - Context-First Architecture
 *
 * The We-Layer (Claude) runs FIRST to build rich context,
 * then the I-Layer (smaller model) uses that context to appear more sophisticated.
 *
 * Philosophy: Claude does the thinking, the conscious layer does the talking.
 */
import type { Mindstate, Turn, ChatOptions } from './types.js';
/**
 * Main chat function - Context-First Architecture
 *
 * Flow:
 * 1. We-Layer runs FIRST → assembles rich context
 * 2. I-Layer receives context → responds naturally
 *
 * This is the key: Claude does the thinking, the conscious layer does the talking.
 */
export declare function chat(message: string, options: ChatOptions): Promise<Turn>;
/** Event types for streaming responses */
export type StreamEvent = {
    type: 'phase';
    phase: 'receiving' | 'unconscious' | 'integrating' | 'conscious' | 'responding' | 'remembering';
} | {
    type: 'context';
    data: {
        emotion: string;
        intent: string;
        depth: string;
        memories: number;
    };
} | {
    type: 'token';
    content: string;
} | {
    type: 'done';
    turn: Turn;
} | {
    type: 'error';
    error: string;
};
/**
 * Streaming chat function - Context-First Architecture with SSE
 *
 * Yields events as they happen:
 * - Phase transitions (for UI updates)
 * - Context brief data (when We-Layer completes)
 * - Token chunks (as I-Layer streams response)
 * - Done (with final Turn object)
 */
export declare function chatStream(message: string, options: ChatOptions): AsyncGenerator<StreamEvent, void, unknown>;
/**
 * Get session history for a user
 */
export declare function getSession(userId: string): {
    turns: Turn[];
    lastMindstate: Mindstate;
} | undefined;
/**
 * Clear session for testing
 */
export declare function clearSession(userId: string): void;
//# sourceMappingURL=orchestrator.d.ts.map