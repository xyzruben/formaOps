/**
 * Execution Repository - Database Integration Layer
 *
 * This repository provides a complete abstraction layer between the AI Results Viewer
 * and the database, transforming database types to ExecutionResult format.
 */

import {
  getExecutionHistory,
  getExecutionById as dbGetExecutionById,
  retryExecution as dbRetryExecution,
  type ExecutionFilters as DbExecutionFilters,
  type ExecutionWithDetails,
} from '../database/queries';
import type { ExecutionResult } from '@/components/execution/ai-results-viewer';
import { ExecutionServiceError } from '../services/execution-service';

// Repository-specific filter types that align with our service layer
export interface ExecutionRepositoryFilters {
  userId: string;
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  promptId?: string;
  from?: string; // ISO string dates
  to?: string; // ISO string dates
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
 * Transforms database ExecutionWithDetails to AI Results Viewer ExecutionResult format
 */
function transformExecutionToResult(
  dbExecution: ExecutionWithDetails
): ExecutionResult {
  // Extract error information for failed executions
  const extractErrorInfo = ():
    | {
        type: 'API_ERROR';
        message: string;
        retryable: boolean;
        details: { logs: string[] };
      }
    | undefined => {
    if (dbExecution.status !== 'FAILED') return undefined;

    // Look for error logs to build meaningful error info
    const errorLogs =
      dbExecution.logs?.filter(log => log.level === 'ERROR') || [];
    const errorMessage =
      errorLogs.length > 0
        ? errorLogs[0].message
        : 'Execution failed with no specific error message';

    return {
      type: 'API_ERROR' as const,
      message: errorMessage,
      retryable: true, // Most failures are retryable
      details: {
        logs: errorLogs.map(log => log.message),
      },
    };
  };

  // Transform token usage format
  const transformTokenUsage = (): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } => {
    if (!dbExecution.tokenUsage) {
      return {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };
    }

    // Handle different token usage formats from database
    const tokenData = dbExecution.tokenUsage as {
      input?: number;
      inputTokens?: number;
      output?: number;
      outputTokens?: number;
      total?: number;
      totalTokens?: number;
    } | null;

    return {
      inputTokens: tokenData?.input || tokenData?.inputTokens || 0,
      outputTokens: tokenData?.output || tokenData?.outputTokens || 0,
      totalTokens:
        tokenData?.total ||
        tokenData?.totalTokens ||
        (tokenData?.input || 0) + (tokenData?.output || 0),
    };
  };

  // Extract execution data with model information
  const extractExecutionData = (): {
    inputs: Record<string, unknown>;
    model: string;
    maxTokens: number;
    temperature: number;
    prompt: { id: string; name: string } | undefined;
  } => {
    const inputs = dbExecution.inputs || {};

    return {
      inputs,
      model: (dbExecution.tokenUsage as any)?.model || 'gpt-3.5-turbo',
      maxTokens: inputs.maxTokens || 2000,
      temperature: inputs.temperature || 0.7,
      prompt: dbExecution.prompt,
    };
  };

  return {
    executionId: dbExecution.id,
    status: dbExecution.status,
    output: dbExecution.output || '',
    tokenUsage: transformTokenUsage(),
    costUsd: dbExecution.costUsd || 0,
    validationStatus: dbExecution.validationStatus,
    validationErrors: [], // Could be extracted from logs if needed
    executionData: extractExecutionData(),
    timestamp: dbExecution.createdAt.toISOString(),
    executionTime: dbExecution.latencyMs || undefined,
    latencyMs: dbExecution.latencyMs || undefined, // Legacy property for compatibility
    ...(dbExecution.status === 'FAILED' && {
      error: extractErrorInfo(),
    }),
  };
}

/**
 * Enhanced Execution Repository Class
 */
export class ExecutionRepository {
  /**
   * Get paginated execution list with filtering
   */
  async getExecutions(
    filters: ExecutionRepositoryFilters
  ): Promise<ExecutionListResponse> {
    try {
      // Transform repository filters to database filters
      const dbFilters: DbExecutionFilters = {
        userId: filters.userId,
        promptId: filters.promptId,
        status: filters.status,
        page: filters.page,
        limit: filters.limit,
      };

      // Add date range if provided
      if (filters.from || filters.to) {
        dbFilters.dateRange = {
          from: filters.from ? new Date(filters.from) : new Date(0),
          to: filters.to ? new Date(filters.to) : new Date(),
        };
      }

      const result = await getExecutionHistory(dbFilters);

      return {
        executions: result.executions.map(transformExecutionToResult),
        pagination: result.pagination,
      };
    } catch (error) {
      throw new ExecutionServiceError(
        `Failed to fetch executions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR',
        500,
        { userId: filters.userId, filters },
        true
      );
    }
  }

  /**
   * Get execution by ID
   */
  async getExecutionById(id: string, userId: string): Promise<ExecutionResult> {
    try {
      const execution = await dbGetExecutionById(id, userId);

      if (!execution) {
        throw new ExecutionServiceError(
          'Execution not found',
          'NOT_FOUND',
          404,
          { executionId: id, userId },
          false
        );
      }

      return transformExecutionToResult(execution);
    } catch (error) {
      if (error instanceof ExecutionServiceError) {
        throw error;
      }

      throw new ExecutionServiceError(
        `Failed to fetch execution: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR',
        500,
        { executionId: id, userId },
        true
      );
    }
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(
    id: string,
    userId: string
  ): Promise<{ newExecutionId: string; originalExecutionId: string }> {
    try {
      const newExecution = await dbRetryExecution(id, userId);

      return {
        newExecutionId: newExecution.id,
        originalExecutionId: id,
      };
    } catch (error) {
      // Handle specific retry validation errors
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new ExecutionServiceError(
            'Execution not found',
            'NOT_FOUND',
            404,
            { executionId: id, userId },
            false
          );
        }

        if (error.message.includes('Only failed executions')) {
          throw new ExecutionServiceError(
            'Only failed executions can be retried',
            'VALIDATION_ERROR',
            400,
            { executionId: id, userId },
            false
          );
        }
      }

      throw new ExecutionServiceError(
        `Failed to retry execution: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR',
        500,
        { executionId: id, userId },
        true
      );
    }
  }

  /**
   * Health check for database connectivity
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // Simple query to test database connectivity
      await getExecutionHistory({
        userId: 'health-check',
        page: 1,
        limit: 1,
      });

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        error:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }
}

// Singleton instance for the repository
export const executionRepository = new ExecutionRepository();

// Types exported above
