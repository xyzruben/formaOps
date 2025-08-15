'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Import from the database queries file to maintain consistency
import type { ExecutionWithDetails } from '../lib/database/queries';

// Export the type for external use
export type { ExecutionWithDetails } from '../lib/database/queries';

// Additional types for the hook
type ExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

// Execution result type matching the API response
interface ExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  output: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  validationStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  validationErrors: string[];
}

// Execute prompt request payload
interface ExecutePromptRequest {
  inputs: Record<string, any>;
  model?: 'gpt-3.5-turbo' | 'gpt-4';
  maxTokens?: number;
  temperature?: number;
}

interface ExecutionsResponse {
  success: boolean;
  data: {
    executions: ExecutionWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface UseExecutionsOptions {
  promptId?: string;
  status?: ExecutionStatus;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseExecutionsReturn {
  executions: ExecutionWithDetails[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  executePrompt: (
    promptId: string,
    inputs: Record<string, any>,
    options?: Partial<ExecutePromptRequest>
  ) => Promise<ExecutionResult>;
  retryExecution: (executionId: string) => Promise<void>;
  getExecutionById: (executionId: string) => Promise<ExecutionWithDetails>;
}

export function useExecutions(
  options: UseExecutionsOptions = {}
): UseExecutionsReturn {
  const [data, setData] = useState<ExecutionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const fetchExecutions = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.promptId) params.set('promptId', options.promptId);
      if (options.status) params.set('status', options.status);
      if (options.page) params.set('page', options.page.toString());
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.from) params.set('from', options.from);
      if (options.to) params.set('to', options.to);

      const response = await fetch(`/api/executions?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch executions: ${response.status}`
        );
      }

      const result = await response.json();

      if (!mountedRef.current) return; // Prevent state update if component unmounted

      setData(result);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching executions:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    options.promptId,
    options.status,
    options.page,
    options.limit,
    options.from,
    options.to,
  ]);

  const executePrompt = useCallback(
    async (
      promptId: string,
      inputs: Record<string, any>,
      executionOptions?: Partial<ExecutePromptRequest>
    ): Promise<ExecutionResult> => {
      try {
        const requestPayload: ExecutePromptRequest = {
          inputs,
          ...executionOptions,
        };

        const response = await fetch(`/api/prompts/${promptId}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to execute prompt: ${response.status}`
          );
        }

        const result = await response.json();

        // Refresh the executions list to show the new execution
        if (mountedRef.current) {
          await fetchExecutions();
        }

        return result;
      } catch (err) {
        console.error('Error executing prompt:', err);
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [fetchExecutions]
  );

  const retryExecution = useCallback(
    async (executionId: string): Promise<void> => {
      try {
        const response = await fetch(`/api/executions/${executionId}/retry`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to retry execution: ${response.status}`
          );
        }

        // Refresh the list after retry
        if (mountedRef.current) {
          await fetchExecutions();
        }
      } catch (err) {
        console.error('Error retrying execution:', err);
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [fetchExecutions]
  );

  const getExecutionById = useCallback(
    async (executionId: string): Promise<ExecutionWithDetails> => {
      try {
        const response = await fetch(`/api/executions/${executionId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to fetch execution: ${response.status}`
          );
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('Error fetching execution by ID:', err);
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    []
  );

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchExecutions();

    // Setup auto-refresh if enabled
    if (options.autoRefresh && options.refreshInterval) {
      const interval = Math.max(options.refreshInterval, 1000); // Minimum 1 second

      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchExecutions();
        }
      }, interval);
    }

    // Cleanup interval on dependencies change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [fetchExecutions, options.autoRefresh, options.refreshInterval]);

  return {
    executions: data?.data?.executions || [],
    pagination: data?.data?.pagination,
    loading,
    error,
    refetch: fetchExecutions,
    executePrompt,
    retryExecution,
    getExecutionById,
  };
}
