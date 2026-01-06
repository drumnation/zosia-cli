/**
 * Retry on Error Tests - TDD
 *
 * Tests for error detection and retry logic.
 * Ties to real error types from OpenRouter and network errors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  isRetryableError,
  createRetryHandler,
  type RetryHandler,
  type RetryOptions,
  type RetryableError,
} from '../src/retry.js';

describe('Retry on Error', () => {
  describe('isRetryableError()', () => {
    it('should identify rate limit errors (429)', () => {
      const error = new Error('Rate limit exceeded');
      (error as RetryableError).status = 429;

      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify server errors (500, 502, 503)', () => {
      for (const status of [500, 502, 503, 504]) {
        const error = new Error('Server error');
        (error as RetryableError).status = status;

        expect(isRetryableError(error)).toBe(true);
      }
    });

    it('should identify network timeout errors', () => {
      const error = new Error('Request timed out');
      error.name = 'AbortError';

      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify connection errors', () => {
      const error = new Error('fetch failed');
      error.name = 'TypeError';

      expect(isRetryableError(error)).toBe(true);
    });

    it('should NOT retry 400 Bad Request', () => {
      const error = new Error('Bad request');
      (error as RetryableError).status = 400;

      expect(isRetryableError(error)).toBe(false);
    });

    it('should NOT retry 401 Unauthorized', () => {
      const error = new Error('Invalid API key');
      (error as RetryableError).status = 401;

      expect(isRetryableError(error)).toBe(false);
    });

    it('should NOT retry 404 Not Found', () => {
      const error = new Error('Model not found');
      (error as RetryableError).status = 404;

      expect(isRetryableError(error)).toBe(false);
    });

    it('should NOT retry generic errors without status', () => {
      const error = new Error('Something went wrong');

      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('createRetryHandler()', () => {
    let handler: RetryHandler;

    beforeEach(() => {
      handler = createRetryHandler({
        maxRetries: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
      });
    });

    describe('initial state', () => {
      it('should start with zero attempts', () => {
        expect(handler.getAttemptCount()).toBe(0);
      });

      it('should not be exhausted', () => {
        expect(handler.isExhausted()).toBe(false);
      });
    });

    describe('recordAttempt()', () => {
      it('should increment attempt count', () => {
        handler.recordAttempt();
        expect(handler.getAttemptCount()).toBe(1);

        handler.recordAttempt();
        expect(handler.getAttemptCount()).toBe(2);
      });
    });

    describe('shouldRetry()', () => {
      it('should return true for retryable error within limit', () => {
        const error = new Error('Rate limit');
        (error as RetryableError).status = 429;

        expect(handler.shouldRetry(error)).toBe(true);
      });

      it('should return false when max retries exhausted', () => {
        const error = new Error('Rate limit');
        (error as RetryableError).status = 429;

        handler.recordAttempt();
        handler.recordAttempt();
        handler.recordAttempt();

        expect(handler.shouldRetry(error)).toBe(false);
        expect(handler.isExhausted()).toBe(true);
      });

      it('should return false for non-retryable error', () => {
        const error = new Error('Bad request');
        (error as RetryableError).status = 400;

        expect(handler.shouldRetry(error)).toBe(false);
      });
    });

    describe('getNextDelay()', () => {
      it('should return base delay on first retry', () => {
        handler.recordAttempt();
        const delay = handler.getNextDelay();

        // Should be around baseDelay (100ms) with some jitter
        expect(delay).toBeGreaterThanOrEqual(80);
        expect(delay).toBeLessThanOrEqual(200);
      });

      it('should increase delay exponentially', () => {
        handler.recordAttempt();
        const delay1 = handler.getNextDelay();

        handler.recordAttempt();
        const delay2 = handler.getNextDelay();

        handler.recordAttempt();
        const delay3 = handler.getNextDelay();

        // Each delay should be roughly 2x previous (with jitter)
        expect(delay2).toBeGreaterThan(delay1);
        expect(delay3).toBeGreaterThan(delay2);
      });

      it('should cap delay at maxDelay', () => {
        // Create handler with low max
        const limitedHandler = createRetryHandler({
          maxRetries: 10,
          baseDelayMs: 100,
          maxDelayMs: 500,
        });

        // Exhaust retries to get max delay
        for (let i = 0; i < 10; i++) {
          limitedHandler.recordAttempt();
        }

        const delay = limitedHandler.getNextDelay();
        expect(delay).toBeLessThanOrEqual(600); // maxDelay + jitter
      });
    });

    describe('reset()', () => {
      it('should clear attempt count', () => {
        handler.recordAttempt();
        handler.recordAttempt();
        expect(handler.getAttemptCount()).toBe(2);

        handler.reset();
        expect(handler.getAttemptCount()).toBe(0);
        expect(handler.isExhausted()).toBe(false);
      });
    });

    describe('getLastError()', () => {
      it('should return null initially', () => {
        expect(handler.getLastError()).toBeNull();
      });

      it('should store last error from shouldRetry', () => {
        const error = new Error('Test error');
        (error as RetryableError).status = 429;

        handler.shouldRetry(error);

        expect(handler.getLastError()).toBe(error);
      });
    });
  });

  describe('retry with async operation', () => {
    it('should retry failed operation and succeed', async () => {
      const handler = createRetryHandler({
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 50,
      });

      let callCount = 0;
      const operation = vi.fn(async () => {
        callCount++;
        if (callCount < 3) {
          const error = new Error('Rate limit');
          (error as RetryableError).status = 429;
          throw error;
        }
        return 'success';
      });

      let result: string | undefined;
      let lastError: Error | null = null;

      while (!handler.isExhausted()) {
        try {
          result = await operation();
          break;
        } catch (error) {
          handler.recordAttempt();
          if (handler.shouldRetry(error as Error)) {
            await new Promise((r) => setTimeout(r, handler.getNextDelay()));
          } else {
            lastError = error as Error;
            break;
          }
        }
      }

      expect(result).toBe('success');
      expect(callCount).toBe(3);
    });

    it('should give up after max retries', async () => {
      const handler = createRetryHandler({
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 50,
      });

      const operation = vi.fn(async () => {
        const error = new Error('Rate limit');
        (error as RetryableError).status = 429;
        throw error;
      });

      let result: string | undefined;

      while (!handler.isExhausted()) {
        try {
          result = await operation();
          break;
        } catch (error) {
          handler.recordAttempt();
          if (handler.shouldRetry(error as Error)) {
            await new Promise((r) => setTimeout(r, handler.getNextDelay()));
          } else {
            break;
          }
        }
      }

      expect(result).toBeUndefined();
      expect(handler.isExhausted()).toBe(true);
      // With maxRetries=2: 1 initial + 1 retry before exhausted
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
