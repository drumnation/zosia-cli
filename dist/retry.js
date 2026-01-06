/**
 * Retry on Error Module
 *
 * Handles retryable errors with exponential backoff.
 * Ties to real HTTP status codes from OpenRouter API.
 */
/** HTTP status codes that are retryable */
const RETRYABLE_STATUS_CODES = new Set([
    429, // Rate limit
    500, // Internal server error
    502, // Bad gateway
    503, // Service unavailable
    504, // Gateway timeout
]);
/** Error names that indicate network/timeout issues */
const RETRYABLE_ERROR_NAMES = new Set([
    'AbortError', // Timeout
    'TypeError', // Network failure (fetch failed)
]);
/**
 * Check if an error is retryable
 */
export function isRetryableError(error) {
    const retryableError = error;
    // Check HTTP status code
    if (retryableError.status !== undefined) {
        return RETRYABLE_STATUS_CODES.has(retryableError.status);
    }
    // Check error name for network/timeout errors
    if (RETRYABLE_ERROR_NAMES.has(error.name)) {
        return true;
    }
    return false;
}
/**
 * Create a retry handler with exponential backoff
 */
export function createRetryHandler(options) {
    const { maxRetries, baseDelayMs, maxDelayMs } = options;
    let attemptCount = 0;
    let lastError = null;
    /**
     * Calculate delay with exponential backoff and jitter
     */
    const calculateDelay = () => {
        // Exponential backoff: baseDelay * 2^(attempt-1)
        const exponentialDelay = baseDelayMs * Math.pow(2, attemptCount - 1);
        // Cap at maxDelay
        const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
        // Add jitter (±20%)
        const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
        return Math.round(cappedDelay + jitter);
    };
    return {
        recordAttempt() {
            attemptCount++;
        },
        shouldRetry(error) {
            lastError = error;
            if (attemptCount >= maxRetries) {
                return false;
            }
            return isRetryableError(error);
        },
        getNextDelay() {
            return calculateDelay();
        },
        getAttemptCount() {
            return attemptCount;
        },
        isExhausted() {
            return attemptCount >= maxRetries;
        },
        reset() {
            attemptCount = 0;
            lastError = null;
        },
        getLastError() {
            return lastError;
        },
    };
}
