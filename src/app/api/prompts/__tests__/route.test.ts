// Mock database queries - must be hoisted - use the alias path to match the route imports
jest.mock('@/lib/database/queries', () => ({
  getUserPrompts: jest.fn(),
  createPrompt: jest.fn(),
}));

// Mock auth server
jest.mock('@/lib/auth/server', () => ({
  requireAuth: jest.fn(() => {
    console.log('requireAuth mock called');
    return Promise.resolve({ id: 'user-123' });
  }),
  getUser: jest.fn(),
  createServerSupabaseClient: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getUserPrompts, createPrompt } from '@/lib/database/queries';
import { requireAuth } from '@/lib/auth/server';

// Get typed mocks for better intellisense
const mockGetUserPrompts = getUserPrompts as jest.MockedFunction<
  typeof getUserPrompts
>;
const mockCreatePrompt = createPrompt as jest.MockedFunction<
  typeof createPrompt
>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

describe('/api/prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup auth mock to return test user with minimal structure
    mockRequireAuth.mockResolvedValue({
      id: 'user-123',
    } as any);
  });

  describe('GET /api/prompts', () => {
    it('should return user prompts', async () => {
      const mockResult = {
        prompts: [
          {
            id: 'prompt-1',
            name: 'Test Prompt',
            description: 'Test description',
            status: 'PUBLISHED' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { executions: 0 },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockGetUserPrompts.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/prompts?page=1&limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      try {
        const response = await GET(request);
        const data = await response.json();

        // Debug information
        console.log('Response status:', response.status);
        console.log('Response data:', data);
        console.log('Mock called times:', mockGetUserPrompts.mock.calls.length);
        console.log('RequireAuth called times:', mockRequireAuth.mock.calls.length);
        
        expect(response.status).toBe(200);
        expect(data).toEqual(mockResult);
        expect(mockGetUserPrompts).toHaveBeenCalledWith('user-123', {
          page: 1,
          limit: 20,
        });
      } catch (error) {
        console.error('Error during test execution:', error);
        throw error;
      }
    });

    it('should handle database errors', async () => {
      mockGetUserPrompts.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/prompts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.code).toBe('INTERNAL_ERROR');
    });

    it('should support pagination', async () => {
      mockGetUserPrompts.mockResolvedValue({
        prompts: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/prompts?page=2&limit=10'
      );
      await GET(request);

      expect(mockGetUserPrompts).toHaveBeenCalledWith('user-123', {
        page: 2,
        limit: 10,
      });
    });

    it('should support search filtering', async () => {
      mockGetUserPrompts.mockResolvedValue({
        prompts: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/prompts?search=test'
      );
      await GET(request);

      expect(mockGetUserPrompts).toHaveBeenCalledWith('user-123', {
        page: 1,
        limit: 20,
        search: 'test',
      });
    });
  });

  describe('POST /api/prompts', () => {
    it('should create new prompt', async () => {
      const newPrompt = {
        id: 'prompt-2',
        name: 'New Prompt',
        description: 'Test description',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string', required: true }],
        userId: 'user-123',
        status: 'DRAFT' as const,
        version: 1,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
      };

      mockCreatePrompt.mockResolvedValue(newPrompt);

      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'New Prompt',
          template: 'Hello {{name}}',
          variables: [{ name: 'name', type: 'string', required: true }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(newPrompt);
      expect(mockCreatePrompt).toHaveBeenCalledWith('user-123', {
        name: 'New Prompt',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string', required: true }],
      });
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test',
          // Missing template and variables
          variables: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should validate prompt name length', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '', // Empty name
          template: 'Hello world',
          variables: [], // Required field
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should validate variable definitions', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Prompt',
          template: 'Hello {{name}}',
          variables: [
            { name: '', type: 'string', required: true }, // Invalid variable name
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should detect template variables automatically', async () => {
      const newPrompt = {
        id: 'prompt-3',
        name: 'Auto Variables',
        description: null,
        template: 'Hello {{name}}, you are {{age}} years old',
        variables: [
          { name: 'name', type: 'string', required: true },
          { name: 'age', type: 'string', required: true },
        ],
        userId: 'user-123',
        status: 'DRAFT' as const,
        version: 1,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
      };

      mockCreatePrompt.mockResolvedValue(newPrompt);

      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Auto Variables',
          template: 'Hello {{name}}, you are {{age}} years old',
          variables: [], // Empty variables - should be auto-detected
        }),
      });

      await POST(request);

      // Should create prompt with auto-detected variables
      expect(mockCreatePrompt).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          variables: expect.arrayContaining([
            expect.objectContaining({ name: 'name' }),
            expect.objectContaining({ name: 'age' }),
          ]),
        })
      );
    });

    it('should handle database constraints', async () => {
      mockCreatePrompt.mockRejectedValue(new Error('Unique constraint failed'));

      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Duplicate Name',
          template: 'Hello world',
          variables: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.code).toBe('INTERNAL_ERROR');
    });

    it('should handle JSON input properly', async () => {
      const newPrompt = {
        id: 'prompt-4',
        name: 'Test Prompt',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string', required: true }],
        userId: 'user-123',
        status: 'DRAFT' as const,
        version: 1,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
      };

      mockCreatePrompt.mockResolvedValue(newPrompt);

      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Prompt',
          template: 'Hello {{name}}',
          variables: [{ name: 'name', type: 'string', required: true }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(newPrompt);
      expect(mockCreatePrompt).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'Test Prompt',
          template: 'Hello {{name}}',
          variables: [{ name: 'name', type: 'string', required: true }],
        })
      );
    });
  });
});
