/**
 * Client-Side Execution API Wrapper
 *
 * This file provides client-safe functions to interact with execution
 * API routes. It should be used by client components instead of directly
 * importing execution-service.
 */

import type { ExecutionResult } from '@/components/execution/ai-results-viewer';

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

export class ExecutionAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ExecutionAPIError';
  }
}

/**
 * Fetch execution list with filtering and pagination
 */
export async function getExecutions(
  filters: ExecutionFilters = {}
): Promise<ExecutionListResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.promptId) params.append('promptId', filters.promptId);
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);

  const url = `/api/executions?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to fetch executions',
    }));
    throw new ExecutionAPIError(
      error.error || 'Failed to fetch executions',
      response.status,
      error.code
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Fetch execution details by ID
 */
export async function getExecutionById(id: string): Promise<ExecutionResult> {
  if (!id) {
    throw new ExecutionAPIError(
      'Execution ID is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  const response = await fetch(`/api/executions/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to fetch execution',
    }));
    throw new ExecutionAPIError(
      error.error || 'Failed to fetch execution',
      response.status,
      error.code
    );
  }

  const data = await response.json();
  return data;
}

export interface RetryExecutionResponse {
  success: boolean;
  data: {
    newExecutionId: string;
    originalExecutionId: string;
    message: string;
  };
}

/**
 * Retry a failed execution
 */
export async function retryExecution(
  id: string
): Promise<RetryExecutionResponse> {
  if (!id) {
    throw new ExecutionAPIError(
      'Execution ID is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  const response = await fetch(`/api/executions/${id}/retry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to retry execution',
    }));
    throw new ExecutionAPIError(
      error.error || 'Failed to retry execution',
      response.status,
      error.code
    );
  }

  const data = await response.json();
  return data;
}
