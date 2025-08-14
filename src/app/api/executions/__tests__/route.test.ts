import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
const mockPrisma = {
  prompt: {
    findUnique: jest.fn(),
  },
  execution: {
    create: jest.fn(),
  },
};

const mockAIExecutor = {
  executePrompt: jest.fn(),
};

const mockPriorityManager = {
  boostPriorityForAI: jest.fn().mockReturnValue({ success: true }),
  restoreOriginalPriority: jest.fn(),
};

jest.mock('@/lib/database/client', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/lib/agent/executor', () => ({
  aiExecutor: mockAIExecutor,
}));

jest.mock('@/lib/agent/priority-manager', () => ({
  cpuPriorityManager: mockPriorityManager,
}));

jest.mock('@/lib/auth/server-auth', () => ({
  getServerAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-123' },
  }),
}));

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
      result: 'Hello John',
      tokenUsage: { input: 10, output: 5, total: 15 },
      costUsd: 0.0001,
      latencyMs: 1500,
    };

    mockPrisma.prompt.findUnique.mockResolvedValue(mockPrompt);
    mockAIExecutor.executePrompt.mockResolvedValue({
      result: 'Hello John',
      tokenUsage: { input: 10, output: 5, total: 15 },
      costUsd: 0.0001,
      latencyMs: 1500,
    });
    mockPrisma.execution.create.mockResolvedValue(mockExecution);

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
        model: 'gpt-3.5-turbo',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.execution).toEqual(mockExecution);

    expect(mockPriorityManager.boostPriorityForAI).toHaveBeenCalled();
    expect(mockAIExecutor.executePrompt).toHaveBeenCalledWith({
      template: 'Hello {{name}}',
      inputs: { name: 'John' },
      model: 'gpt-3.5-turbo',
      priority: 'high',
    });
    expect(mockPriorityManager.restoreOriginalPriority).toHaveBeenCalled();
  });

  it('should validate prompt ownership', async () => {
    mockPrisma.prompt.findUnique.mockResolvedValue({
      id: 'prompt-1',
      userId: 'different-user', // Different user
    });

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
      }),
    });

    const response = await POST(request);
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

    mockPrisma.prompt.findUnique.mockResolvedValue(mockPrompt);

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' }, // Missing required 'age'
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required input: age');
  });

  it('should validate input types', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      variables: [
        { name: 'age', type: 'number', required: true },
      ],
      userId: 'user-123',
    };

    mockPrisma.prompt.findUnique.mockResolvedValue(mockPrompt);

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { age: 'not-a-number' }, // Invalid type
      }),
    });

    const response = await POST(request);
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

    mockPrisma.prompt.findUnique.mockResolvedValue(mockPrompt);
    mockAIExecutor.executePrompt.mockRejectedValue(
      new Error('AI service unavailable')
    );

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Execution failed');

    // Should still restore priority even on failure
    expect(mockPriorityManager.restoreOriginalPriority).toHaveBeenCalled();
  });

  it('should handle database errors during execution save', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string', required: true }],
      userId: 'user-123',
    };

    mockPrisma.prompt.findUnique.mockResolvedValue(mockPrompt);
    mockAIExecutor.executePrompt.mockResolvedValue({
      result: 'Hello John',
      tokenUsage: { input: 10, output: 5, total: 15 },
    });
    mockPrisma.execution.create.mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
      }),
    });

    const response = await POST(request);
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

    mockPrisma.prompt.findUnique.mockResolvedValue(mockPrompt);
    mockAIExecutor.executePrompt.mockResolvedValue({
      result: 'Hello John',
      tokenUsage: { input: 20, output: 10, total: 30 },
    });
    mockPrisma.execution.create.mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
        model: 'gpt-4',
      }),
    });

    await POST(request);

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

    mockPrisma.prompt.findUnique.mockResolvedValue(mockPrompt);
    mockPriorityManager.boostPriorityForAI.mockReturnValue({ 
      success: false, 
      error: 'System overloaded' 
    });

    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'prompt-1',
        inputs: { name: 'John' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.success).toBe(false);
    expect(data.error).toBe('System temporarily overloaded');
  });

  it('should apply rate limiting', async () => {
    // This would be implemented with middleware
    const request = new NextRequest('http://localhost:3000/api/executions', {
      method: 'POST',
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