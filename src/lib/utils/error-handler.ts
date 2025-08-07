export interface AppError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;
}

export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error implements AppError {
  code = 'UNAUTHORIZED';
  statusCode = 401;

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends Error implements AppError {
  code = 'NOT_FOUND';
  statusCode = 404;

  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error implements AppError {
  code = 'RATE_LIMIT_EXCEEDED';
  statusCode = 429;
  retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ServiceUnavailableError extends Error implements AppError {
  code = 'SERVICE_UNAVAILABLE';
  statusCode = 503;

  constructor(service: string) {
    super(`${service} is currently unavailable`);
    this.name = 'ServiceUnavailableError';
  }
}

export function handleApiError(error: unknown): {
  error: string;
  code: string;
  details?: unknown;
  statusCode: number;
} {
  // Handle custom app errors
  if (error && typeof error === 'object' && 'code' in error && 'statusCode' in error) {
    const appError = error as AppError;
    return {
      error: appError.message,
      code: appError.code,
      details: appError.details,
      statusCode: appError.statusCode,
    };
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; message: string };
    
    switch (prismaError.code) {
      case 'P2002':
        return {
          error: 'Resource already exists',
          code: 'CONFLICT',
          statusCode: 409,
        };
      case 'P2025':
        return {
          error: 'Resource not found',
          code: 'NOT_FOUND',
          statusCode: 404,
        };
      default:
        return {
          error: 'Database error',
          code: 'DATABASE_ERROR',
          statusCode: 500,
        };
    }
  }

  // Handle OpenAI errors
  if (error && typeof error === 'object' && 'status' in error) {
    const openaiError = error as { status: number; message: string };
    
    if (openaiError.status === 429) {
      return {
        error: 'AI service rate limit exceeded',
        code: 'AI_RATE_LIMIT',
        statusCode: 429,
      };
    }
    
    return {
      error: 'AI service error',
      code: 'AI_ERROR',
      statusCode: 503,
    };
  }

  // Handle standard errors
  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  // Fallback for unknown errors
  return {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}