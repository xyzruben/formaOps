import { logger } from '@/lib/monitoring/logger';

export interface ExecutionError {
  type: 'RATE_LIMIT' | 'API_ERROR' | 'TIMEOUT' | 'VALIDATION_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

export class ExecutionErrorHandler {
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 1000;

  /**
   * Handles and classifies errors from execution attempts
   */
  handleError(error: any): ExecutionError {
    // OpenAI rate limiting errors
    if (error.status === 429 || error.code === 'rate_limit_exceeded') {
      return {
        type: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please try again later.',
        retryable: true,
        retryAfter: this.extractRetryAfter(error) || 60,
      };
    }

    // OpenAI API errors
    if (error.status >= 500 || error.code === 'api_error') {
      return {
        type: 'API_ERROR',
        message: error.message || 'API service temporarily unavailable',
        retryable: true,
      };
    }

    // Timeout errors
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.name === 'TimeoutError'
    ) {
      return {
        type: 'TIMEOUT',
        message: 'Request timed out. Please try again.',
        retryable: true,
      };
    }

    // Validation errors (client-side, should not retry)
    if (error.status === 400 || error.code === 'invalid_request_error') {
      return {
        type: 'VALIDATION_ERROR',
        message: error.message || 'Invalid request parameters',
        retryable: false,
      };
    }

    // Default to API error for unknown errors
    return {
      type: 'API_ERROR',
      message: error.message || 'An unexpected error occurred',
      retryable: true,
    };
  }

  /**
   * Determines if an error should be retried based on type and attempt count
   */
  shouldRetry(error: ExecutionError, attemptCount: number): boolean {
    if (!error.retryable) {
      return false;
    }

    if (attemptCount >= this.maxRetries) {
      return false;
    }

    // Always retry rate limits and timeouts (up to max attempts)
    if (error.type === 'RATE_LIMIT' || error.type === 'TIMEOUT') {
      return true;
    }

    // Retry API errors with exponential backoff
    if (error.type === 'API_ERROR') {
      return attemptCount < this.maxRetries;
    }

    return false;
  }

  /**
   * Calculates retry delay with exponential backoff
   */
  getRetryDelay(attemptCount: number, error?: ExecutionError): number {
    // Use specific retry-after for rate limits
    if (error?.type === 'RATE_LIMIT' && error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attemptCount - 1);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;

    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Logs execution errors for monitoring and debugging
   */
  logError(
    executionId: string,
    error: ExecutionError,
    attemptCount: number = 1
  ): void {
    const logData = {
      executionId,
      errorType: error.type,
      errorMessage: error.message,
      retryable: error.retryable,
      attemptCount,
      retryAfter: error.retryAfter,
      timestamp: new Date().toISOString(),
    };

    if (error.retryable && attemptCount < this.maxRetries) {
      logger.warn('Execution error (will retry)', logData);
    } else {
      logger.error('Execution error (final failure)', logData);
    }
  }

  /**
   * Executes a function with retry logic
   */
  async executeWithRetry<T>(
    executionId: string,
    operation: () => Promise<T>,
    onRetry?: (attempt: number, delay: number) => void
  ): Promise<T> {
    let lastError: ExecutionError | null = null;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const executionError = this.handleError(error);
        lastError = executionError;

        this.logError(executionId, executionError, attempt);

        if (!this.shouldRetry(executionError, attempt)) {
          throw this.createFinalError(executionError, attempt);
        }

        if (attempt <= this.maxRetries) {
          const delay = this.getRetryDelay(attempt, executionError);
          onRetry?.(attempt, delay);

          await this.sleep(delay);
        }
      }
    }

    // This should never be reached due to the throw above, but for type safety
    throw this.createFinalError(lastError!, this.maxRetries + 1);
  }

  /**
   * Creates a final error after all retries are exhausted
   */
  private createFinalError(error: ExecutionError, attemptCount: number): Error {
    const finalError = new Error(
      `Execution failed after ${attemptCount} attempts: ${error.message}`
    );

    // Attach error metadata for API responses
    (finalError as any).executionError = error;
    (finalError as any).attemptCount = attemptCount;

    return finalError;
  }

  /**
   * Extracts retry-after header from rate limit responses
   */
  private extractRetryAfter(error: any): number | null {
    if (error.headers && error.headers['retry-after']) {
      const retryAfter = parseInt(error.headers['retry-after'], 10);
      return isNaN(retryAfter) ? null : retryAfter;
    }

    if (error.response?.headers && error.response.headers['retry-after']) {
      const retryAfter = parseInt(error.response.headers['retry-after'], 10);
      return isNaN(retryAfter) ? null : retryAfter;
    }

    return null;
  }

  /**
   * Utility function for sleeping/waiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for use across the application
export const executionErrorHandler = new ExecutionErrorHandler();
