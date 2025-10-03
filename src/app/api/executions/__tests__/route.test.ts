import { NextRequest } from 'next/server';
import type { ExecutionResult } from '@/components/execution/ai-results-viewer';

// Mock authentication first
jest.mock('@/lib/auth/server', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    id: 'user-123',
  }),
}));

// Mock the error handler too since the route uses it
jest.mock('@/lib/utils/error-handler', () => ({
  handleApiError: jest.fn().mockReturnValue({
    error: 'Test error',
    code: 'TEST_ERROR',
    statusCode: 500,
  }),
}));

// Mock ExecutionRepository instead of database layer
jest.mock('@/lib/repositories/execution-repository', () => ({
  ExecutionRepository: jest.fn().mockImplementation(() => ({
    getExecutions: jest.fn(),
  })),
}));

import { GET } from '../route';
import { ExecutionRepository } from '@/lib/repositories/execution-repository';

// Get typed mock instance
const MockExecutionRepository = ExecutionRepository as jest.MockedClass<
  typeof ExecutionRepository
>;

describe('/api/executions', () => {
  let mockGetExecutions: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExecutions = jest.fn();
    MockExecutionRepository.mockImplementation(
      () =>
        ({
          getExecutions: mockGetExecutions,
        }) as any
    );
  });

  it('should return execution history successfully', async () => {
    // Mock data in ExecutionResult format (what the repository returns)
    const mockExecutions: ExecutionResult[] = [
      {
        executionId: 'execution-1',
        status: 'COMPLETED' as const,
        output: 'Hello John',
        tokenUsage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        costUsd: 0.001,
        validationStatus: 'PASSED' as const,
        validationErrors: [],
        executionData: {
          inputs: { name: 'John' },
          model: 'gpt-3.5-turbo',
          maxTokens: 2000,
          temperature: 0.7,
          prompt: {
            id: 'prompt-1',
            name: 'Test Prompt 1',
          },
        },
        timestamp: new Date().toISOString(),
        executionTime: 150,
        latencyMs: 150,
      },
      {
        executionId: 'execution-2',
        status: 'FAILED' as const,
        output: '',
        tokenUsage: {
          inputTokens: 8,
          outputTokens: 0,
          totalTokens: 8,
        },
        costUsd: 0,
        validationStatus: 'FAILED' as const,
        validationErrors: [],
        executionData: {
          inputs: { name: 'Jane' },
          model: 'gpt-3.5-turbo',
          maxTokens: 2000,
          temperature: 0.7,
          prompt: {
            id: 'prompt-2',
            name: 'Test Prompt 2',
          },
        },
        timestamp: new Date().toISOString(),
        executionTime: undefined,
        latencyMs: undefined,
        error: {
          type: 'API_ERROR',
          message: 'Execution failed with no specific error message',
          retryable: true,
          details: {
            logs: [],
          },
        },
      },
    ];

    const mockResult = {
      executions: mockExecutions,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    };

    mockGetExecutions.mockResolvedValue(mockResult);

    const request = new NextRequest('http://localhost:3000/api/executions');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.executions).toEqual(mockExecutions);
    expect(data.data.pagination).toEqual(mockResult.pagination);

    expect(mockGetExecutions).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: undefined,
      status: undefined,
      page: 1,
      limit: 20,
      from: undefined,
      to: undefined,
    });
  });

  it('should support filtering by prompt ID', async () => {
    const mockResult = {
      executions: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };

    mockGetExecutions.mockResolvedValue(mockResult);

    const request = new NextRequest(
      'http://localhost:3000/api/executions?promptId=prompt-1'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetExecutions).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: 'prompt-1',
      status: undefined,
      page: 1,
      limit: 20,
      from: undefined,
      to: undefined,
    });
  });

  it('should support filtering by status', async () => {
    const mockResult = {
      executions: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };

    mockGetExecutions.mockResolvedValue(mockResult);

    const request = new NextRequest(
      'http://localhost:3000/api/executions?status=COMPLETED'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetExecutions).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: undefined,
      status: 'COMPLETED',
      page: 1,
      limit: 20,
      from: undefined,
      to: undefined,
    });
  });

  it('should support pagination', async () => {
    const mockResult = {
      executions: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
    };

    mockGetExecutions.mockResolvedValue(mockResult);

    const request = new NextRequest(
      'http://localhost:3000/api/executions?page=2&limit=10'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetExecutions).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: undefined,
      status: undefined,
      page: 2,
      limit: 10,
      from: undefined,
      to: undefined,
    });
  });

  it('should handle database errors', async () => {
    mockGetExecutions.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/executions');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Test error');
    expect(data.code).toBe('TEST_ERROR');
  });

  it('should support date range filtering', async () => {
    const mockResult = {
      executions: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };

    mockGetExecutions.mockResolvedValue(mockResult);

    const fromDate = '2024-01-01';
    const toDate = '2024-01-31';
    const request = new NextRequest(
      `http://localhost:3000/api/executions?from=${fromDate}&to=${toDate}`
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetExecutions).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: undefined,
      status: undefined,
      page: 1,
      limit: 20,
      from: fromDate,
      to: toDate,
    });
  });
});
