/**
 * Context Handoff Module
 *
 * Handles context window handoff when approaching capacity.
 * The handoff creates a compressed summary via the unconscious mind,
 * preserving essential context while freeing token space.
 *
 * The handoff feels like "remembering" - not a data dump.
 */
/** Default prompt for creating handoff summaries */
export declare const DEFAULT_HANDOFF_PROMPT = "You are the unconscious mind, creating a rich memory of this conversation.\n\nRemember what matters most - not every word, but the essence:\n\n**Emotional State**: {{emotion}}\nWhat is the user feeling? Excited, frustrated, curious, stuck? Carry this forward.\n\n**Current Topic**: {{topic}}\nWhat are we really talking about? The theme beneath the specifics.\n\n**What We've Decided**:\nAny conclusions, agreements, or decisions made together.\n\n**Key Moments**:\nThe turning points, insights, or breakthroughs worth preserving.\n\n**Conversation So Far**:\n{{messages}}\n\n---\n\nCreate a natural, flowing summary that feels like remembering a conversation with a friend.\nNot bullet points. Not a data dump. A rich, organic recollection that preserves:\n- The emotional undertone\n- The subject matter we explored\n- Any decisions or agreements\n- The relationship dynamic\n\nWrite in first person plural (\"We discussed...\", \"We realized...\").\nKeep it concise but complete - this memory will guide our continued conversation.";
/** Configuration for context handoff behavior */
export interface HandoffConfig {
    /** The prompt used to generate handoff summaries */
    prompt: string;
    /** Context percentage threshold that triggers handoff (0-100) */
    threshold: number;
    /** Whether handoff is enabled */
    enabled: boolean;
}
/** Result of creating a handoff summary */
export interface HandoffResult {
    /** The compressed summary text */
    summary: string;
    /** Number of tokens saved by compression */
    tokensSaved: number;
    /** Essential context preserved from the conversation */
    preservedContext: {
        /** Last detected emotional state */
        lastEmotion: string;
        /** Last active topic */
        lastTopic: string;
        /** Key points extracted */
        keyPoints: string[];
    };
}
/** Context provided for creating a handoff summary */
export interface ConversationContext {
    /** Conversation messages */
    messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
    }>;
    /** Current emotional state of the conversation */
    currentEmotion: string;
    /** Current topic being discussed */
    currentTopic: string;
    /** Current token count */
    tokenCount: number;
}
/**
 * Get the current handoff configuration
 */
export declare function getHandoffConfig(): HandoffConfig;
/**
 * Set a custom handoff prompt
 * Persists to config file for cross-session persistence
 */
export declare function setHandoffPrompt(prompt: string): Promise<void>;
/**
 * Reset the handoff prompt to the default
 * Clears from config file to use default
 */
export declare function resetHandoffPrompt(): Promise<void>;
/**
 * Set the handoff threshold (percentage of context that triggers handoff)
 * Persists to config file
 */
export declare function setHandoffThreshold(threshold: number): Promise<void>;
/**
 * Check if handoff should be triggered based on context usage
 *
 * @param contextPercent - Current context usage percentage (0-100)
 * @param threshold - Optional threshold override (uses config if not provided)
 * @returns true if handoff should be triggered
 */
export declare function shouldTriggerHandoff(contextPercent: number, threshold?: number): boolean;
/**
 * Create a handoff summary from the current conversation context
 *
 * This compresses the conversation while preserving essential context:
 * - Emotional state
 * - Current topic
 * - Key decisions and insights
 *
 * @param context - The conversation context to summarize
 * @returns HandoffResult with summary and preserved context
 */
export declare function createHandoffSummary(context: ConversationContext): Promise<HandoffResult>;
//# sourceMappingURL=context-handoff.d.ts.map