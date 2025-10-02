/**
 * Execution Service - Database Integration Layer
 *
 * This service provides a complete abstraction layer over the execution repository,
 * implementing proper error handling, type safety, and data transformation
 * for seamless integration with the AI Results Viewer.
 */

import type { ExecutionResult } from '@/components/execution/ai-results-viewer';
import {
  executionRepository,
  type ExecutionRepositoryFilters,
} from '../repositories/execution-repository';
import { ExecutionServiceError } from '../errors/execution-errors';

// Re-export error class for backward compatibility
export { ExecutionServiceError };

// Legacy API types removed - now using database repository

// Service Configuration
interface ExecutionServiceConfig {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// Filter and Pagination Types (now delegated to repository)
export interface ExecutionFilters {
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  promptId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface ExecutionListResponse {
  executions: ExecutionResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Main Execution Service Class - Now using database repository
 */
export class ExecutionService {
  private readonly config: Required<ExecutionServiceConfig>;
  private readonly repository = executionRepository;

  constructor(config: ExecutionServiceConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  /**
   * Fetch execution list with filtering and pagination - Now using database
   */
  async getExecutions(
    filters: ExecutionFilters = {},
    userId: string
  ): Promise<ExecutionListResponse> {
    try {
      // Transform service filters to repository filters
      const repositoryFilters: ExecutionRepositoryFilters = {
        userId,
        status: filters.status,
        promptId: filters.promptId,
        from: filters.from,
        to: filters.to,
        page: filters.page,
        limit: filters.limit,
      };

      const result = await this.repository.getExecutions(repositoryFilters);
      return result;
    } catch (error) {
      throw this.handleError(error, 'getExecutions');
    }
  }

  /**
   * Fetch detailed execution data by ID - Now using database
   */
  async getExecutionById(id: string, userId: string): Promise<ExecutionResult> {
    if (!id || typeof id !== 'string') {
      throw new ExecutionServiceError(
        'Invalid execution ID',
        'VALIDATION_ERROR',
        400
      );
    }

    // Basic UUID validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ExecutionServiceError(
        'Invalid execution ID format',
        'VALIDATION_ERROR',
        400
      );
    }

    try {
      const execution = await this.repository.getExecutionById(id, userId);
      return execution;
    } catch (error) {
      throw this.handleError(error, 'getExecutionById', { executionId: id });
    }
  }

  /**
   * Retry a failed execution - Now using database
   */
  async retryExecution(
    id: string,
    userId: string
  ): Promise<{ newExecutionId: string; originalExecutionId: string }> {
    if (!id || typeof id !== 'string') {
      throw new ExecutionServiceError(
        'Invalid execution ID',
        'VALIDATION_ERROR',
        400
      );
    }

    try {
      const result = await this.repository.retryExecution(id, userId);
      return result;
    } catch (error) {
      throw this.handleError(error, 'retryExecution', { executionId: id });
    }
  }

  /**
   * Health check method using repository
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    return this.repository.healthCheck();
  }

  /**
   * Handle and transform errors
   */
  private handleError(
    error: unknown,
    operation: string,
    context?: Record<string, any>
  ): ExecutionServiceError {
    if (error instanceof ExecutionServiceError) {
      return error;
    }

    if (error instanceof TypeError) {
      return new ExecutionServiceError(
        `Network error during ${operation}: ${error.message}`,
        'NETWORK_ERROR',
        0,
        context,
        true
      );
    }

    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      return new ExecutionServiceError(
        `Request timeout during ${operation}`,
        'TIMEOUT_ERROR',
        408,
        context,
        true
      );
    }

    return new ExecutionServiceError(
      `Unknown error during ${operation}: ${error instanceof Error ? error.message : String(error)}`,
      'UNKNOWN_ERROR',
      500,
      context,
      false
    );
  }
}

// Singleton instance
export const executionService = new ExecutionService();
