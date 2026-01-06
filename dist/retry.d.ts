/**
 * Retry on Error Module
 *
 * Handles retryable errors with exponential backoff.
 * Ties to real HTTP status codes from OpenRouter API.
 */
/** Error with optional HTTP status code */
export interface RetryableError extends Error {
    status?: number;
}
/** Options for retry handler */
export interface RetryOptions {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Base delay in milliseconds */
    baseDelayMs: number;
    /** Maximum delay in milliseconds */
    maxDelayMs: number;
}
/** Retry handler interface */
export interface RetryHandler {
    /** Record an attempt */
    recordAttempt(): void;
    /** Check if error should be retried */
    shouldRetry(error: Error): boolean;
    /** Get next delay with exponential backoff */
    getNextDelay(): number;
    /** Get current attempt count */
    getAttemptCount(): number;
    /** Check if retries exhausted */
    isExhausted(): boolean;
    /** Reset retry state */
    reset(): void;
    /** Get the last error */
    getLastError(): Error | null;
}
/**
 * Check if an error is retryable
 */
export declare function isRetryableError(error: Error): boolean;
/**
 * Create a retry handler with exponential backoff
 */
export declare function createRetryHandler(options: RetryOptions): RetryHandler;
//# sourceMappingURL=retry.d.ts.map