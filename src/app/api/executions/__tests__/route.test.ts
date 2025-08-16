import { NextRequest } from 'next/server';

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

// Mock database queries using the same relative path as the route
jest.mock('@/lib/database/queries', () => ({
  getExecutionHistory: jest.fn(),
}));

import { GET } from '../route';
import { getExecutionHistory } from '@/lib/database/queries';

// Get typed mocks for better intellisense
const mockGetExecutionHistory = getExecutionHistory as jest.MockedFunction<
  typeof getExecutionHistory
>;

describe('/api/executions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return execution history successfully', async () => {
    const mockExecutions = [
      {
        id: 'execution-1',
        status: 'COMPLETED' as const,
        inputs: { name: 'John' },
        output: 'Hello John',
        validationStatus: 'PASSED' as const,
        latencyMs: 150,
        costUsd: 0.001,
        tokenUsage: { input: 10, output: 5, total: 15 },
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        prompt: {
          id: 'prompt-1',
          name: 'Test Prompt 1',
        },
      },
      {
        id: 'execution-2',
        status: 'FAILED' as const,
        inputs: { name: 'Jane' },
        output: null,
        validationStatus: 'FAILED' as const,
        latencyMs: null,
        costUsd: 0,
        tokenUsage: { input: 8, output: 0, total: 8 },
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
        prompt: {
          id: 'prompt-2',
          name: 'Test Prompt 2',
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

    mockGetExecutionHistory.mockResolvedValue(mockResult);

    const request = new NextRequest('http://localhost:3000/api/executions');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.executions).toEqual(mockExecutions);
    expect(data.data.pagination).toEqual(mockResult.pagination);

    expect(mockGetExecutionHistory).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: undefined,
      status: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('should support filtering by prompt ID', async () => {
    const mockResult = {
      executions: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };

    mockGetExecutionHistory.mockResolvedValue(mockResult);

    const request = new NextRequest(
      'http://localhost:3000/api/executions?promptId=prompt-1'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetExecutionHistory).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: 'prompt-1',
      status: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('should support filtering by status', async () => {
    const mockResult = {
      executions: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };

    mockGetExecutionHistory.mockResolvedValue(mockResult);

    const request = new NextRequest(
      'http://localhost:3000/api/executions?status=COMPLETED'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetExecutionHistory).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: undefined,
      status: 'COMPLETED',
      page: 1,
      limit: 20,
    });
  });

  it('should support pagination', async () => {
    const mockResult = {
      executions: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
    };

    mockGetExecutionHistory.mockResolvedValue(mockResult);

    const request = new NextRequest(
      'http://localhost:3000/api/executions?page=2&limit=10'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetExecutionHistory).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: undefined,
      status: undefined,
      page: 2,
      limit: 10,
    });
  });

  it('should handle database errors', async () => {
    mockGetExecutionHistory.mockRejectedValue(new Error('Database error'));

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

    mockGetExecutionHistory.mockResolvedValue(mockResult);

    const fromDate = '2024-01-01';
    const toDate = '2024-01-31';
    const request = new NextRequest(
      `http://localhost:3000/api/executions?from=${fromDate}&to=${toDate}`
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetExecutionHistory).toHaveBeenCalledWith({
      userId: 'user-123',
      promptId: undefined,
      status: undefined,
      page: 1,
      limit: 20,
      dateRange: {
        from: new Date(fromDate),
        to: new Date(toDate),
      },
    });
  });
});
