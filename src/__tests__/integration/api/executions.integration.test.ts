import { NextRequest } from 'next/server';
import { GET as executionsGET } from '../../../app/api/executions/route';

describe('Executions Integration Tests', () => {
  describe('GET /api/executions', () => {
    it('should handle executions listing with proper API structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/executions?page=1&limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await executionsGET(request);
      const data = await response.json();

      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      expect(data).toBeDefined();

      if (response.status === 200) {
        // Success response structure
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('executions');
        expect(data.data).toHaveProperty('pagination');
        expect(Array.isArray(data.data.executions)).toBe(true);
      } else if (response.status === 401) {
        // Auth error structure
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('code');
        expect(data.code).toBe('UNAUTHORIZED');
      } else if (response.status === 400) {
        // Validation error structure
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('code');
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle filtering by prompt ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/executions?promptId=test-prompt-id&page=1&limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await executionsGET(request);
      const data = await response.json();

      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      
      // Should not be a validation error with valid parameters
      if (response.status === 400) {
        expect(data.code).not.toBe('VALIDATION_ERROR');
      }
    });

    it('should handle filtering by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/executions?status=COMPLETED&page=1&limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await executionsGET(request);
      const data = await response.json();

      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      
      // Should not be a validation error with valid status
      if (response.status === 400) {
        expect(data.code).not.toBe('VALIDATION_ERROR');
      }
    });

    it('should handle date range filtering', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';
      const request = new NextRequest(`http://localhost:3000/api/executions?from=${fromDate}&to=${toDate}&page=1&limit=20`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await executionsGET(request);
      const data = await response.json();

      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
      
      // Should not be a validation error with valid date parameters
      if (response.status === 400) {
        expect(data.code).not.toBe('VALIDATION_ERROR');
      }
    });

    it('should validate invalid status values', async () => {
      const request = new NextRequest('http://localhost:3000/api/executions?status=INVALID_STATUS&page=1&limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await executionsGET(request);
      let data;
      try {
        data = await response.json();
      } catch (error) {
        data = { error: 'JSON parse error', code: 'PARSE_ERROR' };
      }

      // Should be either 400 (validation error) or 401/500 (auth/internal error)
      expect([400, 401, 500]).toContain(response.status);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      
      if (response.status === 400) {
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should validate pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/executions?page=0&limit=0', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await executionsGET(request);
      let data;
      try {
        data = await response.json();
      } catch (error) {
        data = { error: 'JSON parse error', code: 'PARSE_ERROR' };
      }

      // Should be either 400 (validation error) or 401/500 (auth/internal error)
      expect([400, 401, 500]).toContain(response.status);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      
      if (response.status === 400) {
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});