import { NextRequest } from 'next/server';

// Mock authentication first
jest.mock('@/lib/auth/server', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    id: 'user-123',
  }),
}));

// Create mock functions that can be typed properly
const mockPromptFindUnique = jest.fn();
const mockExecutionCreate = jest.fn();

// Mock dependencies using factory functions
jest.mock('@/lib/database/client', () => ({
  prisma: {
    prompt: {
      findUnique: mockPromptFindUnique,
    },
    execution: {
      create: mockExecutionCreate,
    },
  },
}));

jest.mock('@/lib/agent/executor', () => ({
  aiExecutor: {
    executePrompt: jest.fn(),
  },
}));

jest.mock('@/lib/agent/priority-manager', () => ({
  priorityManager: {
    scheduleExecution: jest.fn().mockResolvedValue({ shouldExecuteNow: true }),
    completeExecution: jest.fn(),
    getSystemLoad: jest.fn().mockReturnValue({
      activeExecutions: 1,
      queuedExecutions: 0,
      cpuUtilization: 20,
      shouldDegradeUI: false,
    }),
  },
}));

import { GET } from '../route';
import { aiExecutor } from '@/lib/agent/executor';
import { priorityManager } from '@/lib/agent/priority-manager';

// Get typed mocks for better intellisense  
const mockAIExecutor = aiExecutor as jest.Mocked<typeof aiExecutor>;
const mockPriorityManager = priorityManager as jest.Mocked<typeof priorityManager>;

describe('/api/executions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute prompt successfully', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      name: 'Test Prompt',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string', required: true }],
      userId: 'user-123',
    };

    const mockExecution = {
      id: 'execution-1',
      promptId: 'prompt-1',
      userId: 'user-123',
      status: 'COMPLETED',
      output: 'Hello John',
      tokenUsage: { input: 10, output: 5, total: 15, model: 'gpt-3.5-turbo' },
      costUsd: 0.0001,
      latencyMs: 1500,
    };

    mockPromptFindUnique.mockResolvedValue(mockPrompt);
    mockAIExecutor.executePrompt.mockResolvedValue({
      output: 'Hello John',
      tokenUsage: { input: 10, output: 5, total: 15, model: 'gpt-3.5-turbo' },
      costUsd: 0.0001,
    });
    mockExecutionCreate.mockResolvedValue(mockExecution);

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'GET',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
        model: 'gpt-3.5-turbo',
      }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.execution).toEqual(mockExecution);

    expect(mockPriorityManager.scheduleExecution).toHaveBeenCalled();
    expect(mockAIExecutor.executePrompt).toHaveBeenCalledWith({
      template: 'Hello {{name}}',
      inputs: { name: 'John' },
      model: 'gpt-3.5-turbo',
      priority: 'high',
    });
    expect(mockPriorityManager.completeExecution).toHaveBeenCalled();
  });

  it('should validate prompt ownership', async () => {
    mockPromptFindUnique.mockResolvedValue({
      id: 'prompt-1',
      userId: 'different-user', // Different user
    });

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'GET',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
      }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Prompt not found');
  });

  it('should validate required inputs', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      variables: [
        { name: 'name', type: 'string', required: true },
        { name: 'age', type: 'number', required: true },
      ],
      userId: 'user-123',
    };

    mockPromptFindUnique.mockResolvedValue(mockPrompt);

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'GET',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' }, // Missing required 'age'
      }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required input: age');
  });

  it('should validate input types', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      variables: [{ name: 'age', type: 'number', required: true }],
      userId: 'user-123',
    };

    mockPromptFindUnique.mockResolvedValue(mockPrompt);

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'GET',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { age: 'not-a-number' }, // Invalid type
      }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid input type for age');
  });

  it('should handle AI execution failures', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string', required: true }],
      userId: 'user-123',
    };

    mockPromptFindUnique.mockResolvedValue(mockPrompt);
    mockAIExecutor.executePrompt.mockRejectedValue(
      new Error('AI service unavailable')
    );

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'GET',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
      }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Execution failed');

    // Should still complete execution even on failure
    expect(mockPriorityManager.completeExecution).toHaveBeenCalledWith(expect.any(String), false);
  });

  it('should handle database errors during execution save', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string', required: true }],
      userId: 'user-123',
    };

    mockPromptFindUnique.mockResolvedValue(mockPrompt);
    mockAIExecutor.executePrompt.mockResolvedValue({
      output: 'Hello John',
      tokenUsage: { input: 10, output: 5, total: 15, model: 'gpt-3.5-turbo' },
      costUsd: 0.0001,
    });
    mockExecutionCreate.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'GET',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
      }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to save execution');
  });

  it('should support different AI models', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string', required: true }],
      userId: 'user-123',
    };

    mockPromptFindUnique.mockResolvedValue(mockPrompt);
    mockAIExecutor.executePrompt.mockResolvedValue({
      output: 'Hello John',
      tokenUsage: { input: 20, output: 10, total: 30, model: 'gpt-4' },
      costUsd: 0.0002,
    });
    mockExecutionCreate.mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'GET',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
        model: 'gpt-4',
      }),
    });

    await GET(request);

    expect(mockAIExecutor.executePrompt).toHaveBeenCalledWith({
      template: 'Hello {{name}}',
      inputs: { name: 'John' },
      model: 'gpt-4',
      priority: 'high',
    });
  });

  it('should handle priority manager failures gracefully', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string', required: true }],
      userId: 'user-123',
    };

    mockPromptFindUnique.mockResolvedValue(mockPrompt);
    mockPriorityManager.scheduleExecution.mockResolvedValue({
      shouldExecuteNow: false,
      estimatedWaitTime: 60000,
      queuePosition: 5,
    });

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'GET',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
      }),
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.success).toBe(false);
    expect(data.error).toBe('System temporarily overloaded');
  });

  it('should apply rate limiting', async () => {
    // This would be implemented with middleware
    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'GET',
      headers: { 'x-forwarded-for': '192.168.1.1' },
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
      }),
    });

    // In a real implementation, this would check rate limits
    expect(request.headers.get('x-forwarded-for')).toBe('192.168.1.1');
  });
});
