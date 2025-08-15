import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock Prisma
const mockPrisma = {
  prompt: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('@/lib/database/client', () => ({
  prisma: mockPrisma,
}));

// Mock authentication
jest.mock('@/lib/auth/server-auth', () => ({
  getServerAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-123' },
  }),
}));

describe('/api/prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/prompts', () => {
    it('should return user prompts', async () => {
      const mockPrompts = [
        {
          id: 'prompt-1',
          name: 'Test Prompt',
          template: 'Hello {{name}}',
          variables: [{ name: 'name', type: 'string', required: true }],
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.prompt.findMany.mockResolvedValue(mockPrompts);

      const request = new NextRequest('http://localhost:3000/api/prompts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.prompts).toEqual(mockPrompts);
      expect(mockPrisma.prompt.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.prompt.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/prompts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch prompts');
    });

    it('should support pagination', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/prompts?page=2&limit=10'
      );
      await GET(request);

      expect(mockPrisma.prompt.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { updatedAt: 'desc' },
        skip: 10, // (page - 1) * limit
        take: 10,
      });
    });

    it('should support search filtering', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/prompts?search=test'
      );
      await GET(request);

      expect(mockPrisma.prompt.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { template: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('POST /api/prompts', () => {
    it('should create new prompt', async () => {
      const newPrompt = {
        id: 'prompt-2',
        name: 'New Prompt',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string', required: true }],
        userId: 'user-123',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.prompt.create.mockResolvedValue(newPrompt);

      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Prompt',
          template: 'Hello {{name}}',
          variables: [{ name: 'name', type: 'string', required: true }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.prompt).toEqual(newPrompt);
      expect(mockPrisma.prompt.create).toHaveBeenCalledWith({
        data: {
          name: 'New Prompt',
          template: 'Hello {{name}}',
          variables: [{ name: 'name', type: 'string', required: true }],
          userId: 'user-123',
          version: 1,
        },
      });
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          // Missing template
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Template is required');
    });

    it('should validate prompt name length', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: '', // Empty name
          template: 'Hello world',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Name must be at least 1 character');
    });

    it('should validate variable definitions', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Prompt',
          template: 'Hello {{name}}',
          variables: [
            { name: '', type: 'string' }, // Invalid variable name
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Variable name is required');
    });

    it('should detect template variables automatically', async () => {
      const newPrompt = {
        id: 'prompt-3',
        name: 'Auto Variables',
        template: 'Hello {{name}}, you are {{age}} years old',
        variables: [],
        userId: 'user-123',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.prompt.create.mockResolvedValue(newPrompt);

      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Auto Variables',
          template: 'Hello {{name}}, you are {{age}} years old',
          variables: [], // Empty variables - should be auto-detected
        }),
      });

      await POST(request);

      // Should create prompt with auto-detected variables
      expect(mockPrisma.prompt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variables: expect.arrayContaining([
            expect.objectContaining({ name: 'name' }),
            expect.objectContaining({ name: 'age' }),
          ]),
        }),
      });
    });

    it('should handle database constraints', async () => {
      mockPrisma.prompt.create.mockRejectedValue(
        new Error('Unique constraint failed')
      );

      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Duplicate Name',
          template: 'Hello world',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Prompt name already exists');
    });

    it('should sanitize input data', async () => {
      const request = new NextRequest('http://localhost:3000/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: '  Test Prompt  ', // Extra whitespace
          template: '<script>alert("xss")</script>Hello {{name}}',
          variables: [{ name: 'name', type: 'string' }],
        }),
      });

      await POST(request);

      expect(mockPrisma.prompt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Prompt', // Trimmed
          template: expect.not.stringContaining('<script>'), // Sanitized
        }),
      });
    });
  });
});
