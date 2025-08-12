'use client';

import { useState, useEffect, useCallback } from 'react';

interface ExecutionWithDetails {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  inputs: any;
  output: string | null;
  validationStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  latencyMs: number | null;
  costUsd: number | null;
  tokenUsage: any;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  prompt: {
    id: string;
    name: string;
  };
  logs?: Array<{
    id: string;
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    message: string;
    timestamp: Date;
  }>;
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
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export function useExecutions(options: UseExecutionsOptions = {}) {
  const [data, setData] = useState<ExecutionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch executions');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.promptId, options.status, options.page, options.limit, options.from, options.to]);

  const retryExecution = useCallback(async (executionId: string) => {
    try {
      const response = await fetch(`/api/executions/${executionId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retry execution');
      }

      const result = await response.json();
      
      // Refresh the list after retry
      await fetchExecutions();
      
      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [fetchExecutions]);

  const getExecutionById = useCallback(async (executionId: string) => {
    try {
      const response = await fetch(`/api/executions/${executionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch execution');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, []);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  return {
    executions: data?.data?.executions || [],
    pagination: data?.data?.pagination,
    loading,
    error,
    refetch: fetchExecutions,
    retryExecution,
    getExecutionById,
  };
}