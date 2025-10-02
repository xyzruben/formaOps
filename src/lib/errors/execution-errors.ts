/**
 * Execution Service Error Classes
 *
 * Shared error classes used across execution-related modules to avoid circular dependencies.
 */

/**
 * Custom error class for execution service errors
 */
export class ExecutionServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string = 'EXECUTION_SERVICE_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'ExecutionServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
  }

  public static fromApiError(apiError: unknown): ExecutionServiceError {
    const error = apiError as {
      statusCode?: number;
      error?: string;
      code?: string;
      details?: Record<string, any>;
    };

    return new ExecutionServiceError(
      error.error || 'Execution service error',
      error.code || 'EXECUTION_SERVICE_ERROR',
      error.statusCode || 500,
      error.details,
      false
    );
  }
}
