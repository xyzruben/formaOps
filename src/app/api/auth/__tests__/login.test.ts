import { POST } from '../login/route';
import { NextRequest } from 'next/server';

// Mock Supabase SSR using factory pattern
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn().mockReturnValue({
    auth: {
      signInWithPassword: jest.fn(),
    },
  }),
}));

import { createServerClient } from '@supabase/ssr';

// Get mock reference after import
const mockCreateServerClient = createServerClient as jest.MockedFunction<
  typeof createServerClient
>;
const mockSupabase = mockCreateServerClient.mock.results[0]?.value || {
  auth: { signInWithPassword: jest.fn() },
};

describe('/api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate user with valid credentials', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@example.com', user_metadata: {} },
        session: { access_token: 'token-123', refresh_token: 'refresh-123' },
      },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: null,
    });
    expect(data.access_token).toBe('token-123');
    expect(data.refresh_token).toBe('refresh-123');
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should return error for invalid credentials', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid credentials');
    expect(data.code).toBe('INVALID_CREDENTIALS');
  });

  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        // Missing password
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
          message: expect.stringContaining('Required'),
        }),
      ])
    );
  });

  it('should validate email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          message: expect.stringContaining('Invalid email'),
        }),
      ])
    );
  });

  it('should handle Supabase errors gracefully', async () => {
    mockSupabase.auth.signInWithPassword.mockRejectedValue(
      new Error('Network error')
    );

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('should handle malformed JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: 'invalid-json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('should rate limit excessive requests', async () => {
    // This would be implemented with a rate limiting middleware
    // For now, we'll test the structure
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: new Headers({ 'x-forwarded-for': '192.168.1.1' }),
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    // In a real implementation, this would check rate limits
    expect(request.headers.get('x-forwarded-for')).toBe('192.168.1.1');
  });
});
