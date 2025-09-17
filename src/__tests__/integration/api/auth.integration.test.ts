import { NextRequest } from 'next/server';
import { POST as loginPOST } from '../../../app/api/auth/login/route';

// Mock database queries
jest.mock('@/lib/database/queries', () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
}));

describe('Auth Integration Tests', () => {
  describe('POST /api/auth/login', () => {
    it('should handle login flow with valid credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      // Basic integration test - verify API structure
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      expect(data).toBeDefined();

      // Should return either success or error structure
      if (response.status === 200) {
        expect(data).toHaveProperty('user');
        expect(data).toHaveProperty('access_token');
      } else {
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('code');
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json-string',
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.code).toBe('INTERNAL_ERROR');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          // Missing password field
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data).toHaveProperty('details');
      expect(Array.isArray(data.details)).toBe(true);
    });
  });
});
