/**
 * I-Layer: Conscious Mind via OpenRouter
 * Receives Mindstate, produces response using configured model
 */
import type { Mindstate } from './types.js';
import type { ImageContent } from './attachments.js';
interface ConsciousResponse {
    response: string;
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
    model: string;
    costUsd?: number;
}
interface ConsciousOptions {
    previousResponse?: string;
    instruction?: string;
    debug?: boolean;
    /** Images to include in the message (for vision-capable models) */
    images?: ImageContent[];
}
/**
 * Check if a model supports vision/images
 */
export declare function isVisionModel(modelId: string): boolean;
/**
 * Call the conscious mind via OpenRouter
 * Uses configured model, temperature, and max tokens
 * Supports multimodal content (images) for vision-capable models
 */
export declare function callConscious(mindstate: Mindstate, userMessage: string, options?: ConsciousOptions): Promise<ConsciousResponse>;
/**
 * Call Gemma via OpenRouter (legacy alias)
 * @deprecated Use callConscious instead
 */
export declare function callGemma(mindstate: Mindstate, userMessage: string, options?: ConsciousOptions): Promise<ConsciousResponse>;
/** Options for streaming conscious response */
interface StreamConsciousOptions {
    /** Images to include in the message (for vision-capable models) */
    images?: ImageContent[];
}
/**
 * Stream conscious mind response
 * Uses configured model, temperature, and max tokens
 * Supports multimodal content (images) for vision-capable models
 */
export declare function streamConscious(mindstate: Mindstate, userMessage: string, options?: StreamConsciousOptions): AsyncGenerator<string, void, unknown>;
/**
 * Stream Gemma response (legacy alias)
 * @deprecated Use streamConscious instead
 */
export declare function streamGemma(mindstate: Mindstate, userMessage: string): AsyncGenerator<string, void, unknown>;
export {};
//# sourceMappingURL=i-layer.d.ts.map