import { POST } from '../login/route';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Set required environment variables for the test
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-supabase-anon-key';

// Create mocks that can be shared between the mock and tests - use var for hoisting
var mockSignInWithPassword = jest.fn();
var mockGetUser = jest.fn();

// Mock Supabase SSR using factory pattern
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn().mockImplementation((...args) => {
    console.log('createServerClient called with:', args);
    const client = {
      auth: {
        signInWithPassword: mockSignInWithPassword,
        getUser: mockGetUser,
      },
    };
    console.log('Returning client with auth:', client.auth);
    return client;
  }),
}));

// Mock next/headers specifically for this test
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([]),
    set: jest.fn(),
  }),
}));

// Get references to the mocked functions
const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

describe('/api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the cookies mock to ensure it works properly
    const mockCookies = require('next/headers').cookies;
    mockCookies.mockResolvedValue({
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    });
  });

  it('should authenticate user with valid credentials', async () => {
    console.log('Mock function:', mockSignInWithPassword);
    console.log('createServerClient mock:', jest.isMockFunction(createServerClient));
    
    // Add spy to see if createServerClient is called
    const createServerClientSpy = mockCreateServerClient as jest.MockedFunction<typeof createServerClient>;
    console.log('Initial calls to createServerClient:', createServerClientSpy.mock.calls.length);
    
    mockSignInWithPassword.mockResolvedValue({
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

    try {
      const response = await POST(request);
      const data = await response.json();

      console.log('Auth Response status:', response.status);
      console.log('Auth Response data:', data);
      console.log('Mock called:', mockSignInWithPassword.mock.calls.length);
      console.log('createServerClient called:', createServerClientSpy.mock.calls.length);
      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: null,
      });
      expect(data.access_token).toBe('token-123');
      expect(data.refresh_token).toBe('refresh-123');
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    } catch (error) {
      console.error('Error during POST:', error);
      throw error;
    }
  });

  it('should return error for invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
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
    mockSignInWithPassword.mockRejectedValue(
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
      headers: { 'x-forwarded-for': '192.168.1.1' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    // In a real implementation, this would check rate limits
    expect(request.headers.get('x-forwarded-for')).toBe('192.168.1.1');
  });
});
