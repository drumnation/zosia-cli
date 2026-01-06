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
export function isRetryableError(error: Error): boolean {
  const retryableError = error as RetryableError;

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
export function createRetryHandler(options: RetryOptions): RetryHandler {
  const { maxRetries, baseDelayMs, maxDelayMs } = options;

  let attemptCount = 0;
  let lastError: Error | null = null;

  /**
   * Calculate delay with exponential backoff and jitter
   */
  const calculateDelay = (): number => {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    const exponentialDelay = baseDelayMs * Math.pow(2, attemptCount - 1);

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

    // Add jitter (±20%)
    const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);

    return Math.round(cappedDelay + jitter);
  };

  return {
    recordAttempt(): void {
      attemptCount++;
    },

    shouldRetry(error: Error): boolean {
      lastError = error;

      if (attemptCount >= maxRetries) {
        return false;
      }

      return isRetryableError(error);
    },

    getNextDelay(): number {
      return calculateDelay();
    },

    getAttemptCount(): number {
      return attemptCount;
    },

    isExhausted(): boolean {
      return attemptCount >= maxRetries;
    },

    reset(): void {
      attemptCount = 0;
      lastError = null;
    },

    getLastError(): Error | null {
      return lastError;
    },
  };
}
